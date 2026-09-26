import { afterEach, describe, expect, it, vi } from "vitest";
import { FFMPEG_LARGE_FILE_BYTES } from "@/lib/ffmpeg";
import { loadStudioFile } from "@/lib/studio/load-clip";
import {
  createStudioPlaybackEngine,
  type StudioAnalyserNode,
  type StudioAudioHost,
  type StudioAudioNode,
  type StudioBufferSource,
  type StudioGainNode,
  type StudioLiveStretch,
} from "@/lib/studio/playback-engine";
import type { LiveStretchParams } from "@/lib/audio-stretch-live";
import { dbToGain, planPlayback, playbackArrangementKey } from "@/lib/studio/playback-schedule";
import {
  addImportedFileAsTrack,
  createStudioProject,
  setMasterGain,
  setClipTrim,
  setTrackGain,
  setTrackMuted,
  setTrackPan,
  setTrackPitch,
  setTrackSolo,
  setTrackStretchPreset,
  setTrackTempo,
} from "@/lib/studio/project";
import { qviStudioLimits } from "@/lib/studio/definition";
import type { StudioProject, StudioTrack } from "@/lib/studio/types";
import {
  connectTempoPreview,
  createSoundTouchClipProcessor,
  createTempoPitchPreview,
  createTempoPreviewScheduler,
  mixHeardBuffers,
  mixHeardBuffersCooperative,
  type StudioBufferFactory,
} from "@/lib/studio/tempo-preview";
import { encodeWavPcm16 } from "@/lib/studio/wav";

afterEach(() => {
  vi.useRealTimers();
});

function makeBuffer(length: number, sampleRate: number, fill = 0.25, channels = 1): AudioBuffer {
  const data = Array.from({ length: channels }, () => Float32Array.from({ length }, () => fill));
  return {
    duration: length / sampleRate,
    length,
    sampleRate,
    numberOfChannels: channels,
    getChannelData: (channel: number) => data[channel] ?? data[0]!,
    copyFromChannel() {},
    copyToChannel() {},
  } as AudioBuffer;
}

const createBuffer: StudioBufferFactory = (channels, length, sampleRate) => {
  const data = Array.from({ length: channels }, () => new Float32Array(length));
  return {
    duration: length / sampleRate,
    length,
    sampleRate,
    numberOfChannels: channels,
    getChannelData: (channel: number) => data[channel] ?? data[0]!,
    copyFromChannel() {},
    copyToChannel() {},
  } as AudioBuffer;
};

class FakeGain implements StudioGainNode {
  gain = { value: 1 };
  connect() {}
  disconnect() {}
}

class FakeSource implements StudioBufferSource {
  buffer: AudioBuffer | null = null;
  playbackRate = { value: 1 };
  onended: (() => void) | null = null;
  started: { when: number; offset: number; duration: number } | null = null;
  stopped = false;
  connect() {}
  disconnect() {}
  start(when = 0, offset = 0, duration = 0) {
    this.started = { when, offset, duration };
  }
  stop() {
    this.stopped = true;
  }
}

class FakeHost implements StudioAudioHost {
  currentTime = 0;
  state: AudioContextState = "suspended";
  destination: StudioAudioNode = { connect() {}, disconnect() {} };
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  resumeCount = 0;
  closed = false;

  async resume() {
    this.state = "running";
    this.resumeCount += 1;
  }

  async close() {
    this.closed = true;
    this.state = "closed";
  }

  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }

  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
}

class FakeStretch implements StudioLiveStretch {
  applied: LiveStretchParams | null = null;
  readonly input: StudioAudioNode = this;
  connect() {}
  disconnect() {}
  apply(params: LiveStretchParams) {
    this.applied = params;
  }
}

class LiveHost extends FakeHost {
  stretches: FakeStretch[] = [];
  createLiveStretch() {
    const node = new FakeStretch();
    this.stretches.push(node);
    return node;
  }
}

function imported(fileName: string, seconds: number) {
  return {
    fileName,
    byteLength: 1000,
    sourceDurationSec: seconds,
    sampleRate: 10,
    channels: 1,
    peaks: [0.2],
  };
}

function projectWithClip(options?: {
  offsetSec?: number;
  trimStartSec?: number;
  trimEndSec?: number;
  seconds?: number;
  fill?: number;
}): { project: StudioProject; track: StudioTrack } {
  const seconds = options?.seconds ?? 4;
  const added = addImportedFileAsTrack(createStudioProject("Demo", "project-1"), imported("drums.wav", seconds), "desktop");
  if (!added.ok) throw new Error(added.reason);
  const track = added.project.tracks[0]!;
  const clip = track.clips[0]!;
  clip.buffer = makeBuffer(seconds * 10, 10, options?.fill ?? 0.25);
  clip.offsetSec = options?.offsetSec ?? 0;
  clip.trimStartSec = options?.trimStartSec ?? 0;
  clip.trimEndSec = options?.trimEndSec ?? seconds;
  return { project: added.project, track };
}

describe("playback schedule", () => {
  it("converts unity and boost to linear gain", () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(6)).toBeCloseTo(10 ** (6 / 20), 6);
  });

  it("delays a clip until its offset and trims inside the source", () => {
    const { project } = projectWithClip({ offsetSec: 2, trimStartSec: 1, trimEndSec: 4, seconds: 4 });
    const plan = planPlayback({ project, playheadSec: 0 });
    expect(plan.events).toHaveLength(1);
    expect(plan.events[0]).toMatchObject({ delaySec: 2, offsetSec: 1, durationSec: 3 });
  });

  it("starts inside a clip when the playhead is already there", () => {
    const { project } = projectWithClip({ seconds: 4 });
    const plan = planPlayback({ project, playheadSec: 2.5 });
    expect(plan.events[0]).toMatchObject({ delaySec: 0, offsetSec: 2.5, durationSec: 1.5 });
  });

  it("drops muted tracks and keeps only an unmuted solo", () => {
    const first = projectWithClip();
    const second = addImportedFileAsTrack(first.project, imported("bass.wav", 4), "desktop");
    if (!second.ok) throw new Error(second.reason);
    second.project.tracks[1]!.clips[0]!.buffer = makeBuffer(40, 10, 0.5);
    const muted = setTrackMuted(second.project, second.project.tracks[0]!.id, true);
    if (!muted.ok) throw new Error(muted.reason);
    expect(planPlayback({ project: muted.project, playheadSec: 0 }).events).toHaveLength(1);
    expect(planPlayback({ project: muted.project, playheadSec: 0 }).events[0]!.trackId).toBe(second.project.tracks[1]!.id);

    const solo = setTrackSolo(muted.project, muted.project.tracks[0]!.id, true);
    if (!solo.ok) throw new Error(solo.reason);
    expect(planPlayback({ project: solo.project, playheadSec: 0 }).events).toEqual([]);
  });

  it("keeps the arrangement key for gain, but not when stretch identity changes", () => {
    const { project, track } = projectWithClip({ seconds: 8 });
    const key = playbackArrangementKey(project);
    const gained = setTrackGain(project, track.id, -3);
    if (!gained.ok) throw new Error("edit");
    expect(playbackArrangementKey(gained.project)).toBe(key);
    const pitched = setTrackPitch(project, track.id, { semitones: 3, cents: 15 });
    const tempo = setTrackTempo(project, track.id, { targetBpm: 180 });
    if (!pitched.ok || !tempo.ok) throw new Error("edit");
    expect(playbackArrangementKey(pitched.project)).not.toBe(key);
    expect(playbackArrangementKey(tempo.project)).not.toBe(key);
    const muted = setTrackMuted(project, track.id, true);
    if (!muted.ok) throw new Error("mute");
    expect(playbackArrangementKey(muted.project)).not.toBe(key);
  });

  it("plays a rendered buffer for a tempo change and ignores it when tempo is unchanged", () => {
    const { project, track } = projectWithClip({ seconds: 8 });
    const sped = setTrackTempo(project, track.id, { targetBpm: 240 });
    if (!sped.ok) throw new Error(sped.reason);
    const rendered = makeBuffer(40, 10, 0.4);
    expect(planPlayback({ project: sped.project, playheadSec: 1, renderedTracks: new Map([[track.id, rendered]]) }).events[0]).toMatchObject({
      clipId: null,
      delaySec: 0,
      offsetSec: 1,
      durationSec: 3,
    });
    expect(planPlayback({ project, playheadSec: 0, renderedTracks: new Map([[track.id, rendered]]) }).events[0]!.clipId).toBe(
      track.clips[0]!.id,
    );
  });

  it("plays a live tempo change from the source clip and keeps mute and solo", () => {
    const { project, track } = projectWithClip({ seconds: 8 });
    const sped = setTrackTempo(project, track.id, { targetBpm: 240 });
    if (!sped.ok) throw new Error(sped.reason);
    const speech = setTrackStretchPreset(sped.project, track.id, "speech");
    if (!speech.ok) throw new Error("preset");
    const live = planPlayback({ project: speech.project, playheadSec: 1, live: true });
    expect(live.events).toHaveLength(1);
    expect(live.events[0]).toMatchObject({
      clipId: track.clips[0]!.id,
      delaySec: 0,
      offsetSec: 2,
      durationSec: 6,
      playbackRate: 2,
    });
    expect(live.events[0]!.stretch).toMatchObject({
      playbackRate: 2,
      pitch: 1,
      stretch: { sequenceMs: 40, seekWindowMs: 15, overlapMs: 8, quickSeek: true },
    });

    const identity = planPlayback({ project, playheadSec: 0, live: true });
    expect(identity.events[0]!.stretch).toBeNull();
    expect(identity.events[0]!.playbackRate).toBe(1);
    expect(identity.events[0]!.clipId).toBe(track.clips[0]!.id);

    const muted = setTrackMuted(speech.project, track.id, true);
    if (!muted.ok) throw new Error(muted.reason);
    expect(planPlayback({ project: muted.project, playheadSec: 0, live: true }).events).toEqual([]);
    expect(planPlayback({ project: muted.project, playheadSec: 0, live: true }).trackGains[0]!.linear).toBe(0);
  });

  it("keeps many identity tracks off SoundTouch when live is enabled", () => {
    let project = createStudioProject("Many", "project-many");
    for (let index = 0; index < 10; index += 1) {
      const added = addImportedFileAsTrack(project, imported(`t${index}.wav`, 2), "desktop");
      if (!added.ok) throw new Error(added.reason);
      project = added.project;
      project.tracks[index]!.clips[0]!.buffer = makeBuffer(20, 10, 0.2);
    }
    const plan = planPlayback({ project, playheadSec: 0, live: true });
    expect(plan.events).toHaveLength(10);
    expect(plan.events.every((event) => event.stretch === null && event.playbackRate === 1)).toBe(true);
  });

  it("uses SoundTouch only for the non-identity track among many", () => {
    let project = createStudioProject("Mix", "project-mix");
    for (let index = 0; index < 9; index += 1) {
      const added = addImportedFileAsTrack(project, imported(`plain-${index}.wav`, 4), "desktop");
      if (!added.ok) throw new Error(added.reason);
      project = added.project;
      project.tracks[index]!.clips[0]!.buffer = makeBuffer(40, 10, 0.2);
    }
    const last = addImportedFileAsTrack(project, imported("sped.wav", 8), "desktop");
    if (!last.ok) throw new Error(last.reason);
    project = last.project;
    const spedTrack = project.tracks[9]!;
    spedTrack.clips[0]!.buffer = makeBuffer(80, 10, 0.3);
    const sped = setTrackTempo(project, spedTrack.id, { targetBpm: 240 });
    if (!sped.ok) throw new Error(sped.reason);
    const plan = planPlayback({ project: sped.project, playheadSec: 0, live: true });
    expect(plan.events).toHaveLength(10);
    const stretched = plan.events.filter((event) => event.stretch);
    const plain = plan.events.filter((event) => !event.stretch);
    expect(stretched).toHaveLength(1);
    expect(stretched[0]!.trackId).toBe(spedTrack.id);
    expect(stretched[0]!.playbackRate).toBe(2);
    expect(plain).toHaveLength(9);
    expect(plain.every((event) => event.playbackRate === 1)).toBe(true);
  });
});

describe("playback engine", () => {
  it("schedules from the playhead and applies track and master gain", async () => {
    const host = new FakeHost();
    const engine = createStudioPlaybackEngine({ host });
    const { project, track } = projectWithClip({ offsetSec: 2, seconds: 4 });
    const gained = setTrackGain(project, track.id, 6);
    if (!gained.ok) throw new Error(gained.reason);
    const mastered = setMasterGain(gained.project, -6);
    await engine.resumeFromUserGesture();
    engine.play(mastered);
    expect(host.resumeCount).toBe(1);
    expect(engine.currentStatus()).toBe("playing");
    expect(host.sources).toHaveLength(1);
    expect(host.sources[0]!.started).toEqual({ when: 2, offset: 0, duration: 4 });
    expect(host.gains[0]!.gain.value).toBeCloseTo(10 ** (-6 / 20), 6);
    expect(host.gains[1]!.gain.value).toBeCloseTo(10 ** (6 / 20), 6);
  });

  it("pauses at the clock, seeks while playing, and stops at zero", () => {
    const host = new FakeHost();
    const engine = createStudioPlaybackEngine({ host });
    const { project } = projectWithClip({ seconds: 8 });
    engine.play(project);
    host.currentTime = 1.5;
    engine.pause();
    expect(engine.currentStatus()).toBe("paused");
    expect(engine.currentPlayhead()).toBe(1.5);
    expect(host.sources[0]!.stopped).toBe(true);

    engine.play({ ...project, playheadSec: 1.5 });
    engine.seek(4);
    const latest = host.sources.at(-1)!;
    expect(latest.started).toEqual({ when: 1.5, offset: 4, duration: 4 });
    expect(engine.currentStatus()).toBe("playing");

    engine.stop();
    expect(engine.currentStatus()).toBe("idle");
    expect(engine.currentPlayhead()).toBe(0);
  });

  it("does not start playback from sync, and reschedules when already playing", () => {
    const host = new FakeHost();
    const engine = createStudioPlaybackEngine({ host });
    const { project, track } = projectWithClip();
    const quiet = setMasterGain(project, -12);
    engine.sync(quiet);
    expect(engine.currentStatus()).toBe("idle");
    expect(host.sources).toHaveLength(0);
    expect(host.gains[0]!.gain.value).toBeCloseTo(10 ** (-12 / 20), 6);

    engine.play(quiet);
    const muted = setTrackMuted(quiet, track.id, true);
    if (!muted.ok) throw new Error(muted.reason);
    engine.sync(muted.project);
    expect(engine.currentStatus()).toBe("playing");
    expect(host.sources.filter((source) => !source.stopped)).toHaveLength(0);
  });

  it("ends at the timeline when the clock passes it, including a muted project", () => {
    const host = new FakeHost();
    const engine = createStudioPlaybackEngine({ host });
    const { project, track } = projectWithClip({ seconds: 4 });
    const muted = setTrackMuted(project, track.id, true);
    if (!muted.ok) throw new Error(muted.reason);
    engine.play(muted.project);
    expect(host.sources).toHaveLength(0);
    host.currentTime = 4;
    expect(engine.poll()).toEqual({ status: "paused", playheadSec: 4 });
  });

  it("swaps in a rendered track without leaving the previous source running", () => {
    const host = new FakeHost();
    const engine = createStudioPlaybackEngine({ host });
    const { project, track } = projectWithClip({ seconds: 8 });
    const sped = setTrackTempo(project, track.id, { targetBpm: 240 });
    if (!sped.ok) throw new Error(sped.reason);
    engine.play(sped.project);
    expect(host.sources).toHaveLength(0);
    engine.setRenderedTrack(track.id, makeBuffer(40, 10, 0.4));
    const playing = host.sources.filter((source) => !source.stopped);
    expect(playing).toHaveLength(1);
    expect(playing[0]!.buffer?.duration).toBe(4);
    engine.dispose();
    expect(host.closed).toBe(true);
    engine.play(sped.project);
    expect(engine.currentStatus()).toBe("idle");
  });

  it("reads peaks from analysers tapped after the track and master gains", () => {
    const host = new MeterHost();
    const engine = createStudioPlaybackEngine({ host });
    expect(engine.readMeters()).toEqual({ master: 0, tracks: {} });
    const { project, track } = projectWithClip();
    engine.play(project);
    expect(host.gains[0]!.links[0]).toBe(host.analysers[0]);
    expect(host.analysers[0]!.links[0]).toBe(host.destination);
    expect(host.gains[1]!.links[0]).toBe(host.analysers[1]);
    expect(host.analysers[1]!.links[0]).toBe(host.gains[0]);
    host.analysers[0]!.samples.fill(0.25);
    host.analysers[1]!.samples.fill(-0.5);
    expect(engine.readMeters()).toEqual({ master: 0.25, tracks: { [track.id]: 0.5 } });
  });

  it("runs each source through a fade gain, eq, a compressor, and a panner before the track gain", () => {
    const host = new StripHost();
    const engine = createStudioPlaybackEngine({ host });
    const { project, track } = projectWithClip();
    engine.play(project);
    const source = host.sources[0]!;
    const fadeGain = source.links[0] as MeterGain;
    expect(fadeGain).toBe(host.gains[2]);
    expect(fadeGain.links[0]).toBe(host.biquads[0]);
    expect(host.biquads[0]!.links[0]).toBe(host.biquads[1]);
    expect(host.biquads[1]!.links[0]).toBe(host.biquads[2]);
    expect(host.biquads[2]!.links[0]).toBe(host.compressors[0]);
    expect(host.compressors[0]!.links[0]).toBe(host.panners[0]);
    expect(host.panners[0]!.links[0]).toBe(host.gains[1]);
    expect(host.gains[1]!.links[0]).toBe(host.analysers[1]);
    const next = {
      ...project,
      tracks: [{ ...track, pan: -0.5, eq: { lowDb: 3, midDb: -1, highDb: 2 }, compressor: 1 }],
    };
    engine.sync(next);
    expect(host.panners[0]!.pan.value).toBe(-0.5);
    expect(host.biquads[0]!.gain.value).toBe(3);
    expect(host.biquads[1]!.gain.value).toBe(-1);
    expect(host.biquads[2]!.gain.value).toBe(2);
    expect(host.compressors[0]!.threshold.value).toBe(-24);
    expect(host.compressors[0]!.ratio.value).toBe(4);
  });

  it("updates live pitch without restarting and still bakes nothing into the source rate by itself", () => {
    const host = new LiveHost();
    const engine = createStudioPlaybackEngine({ host });
    const { project, track } = projectWithClip({ seconds: 8 });
    const sped = setTrackTempo(project, track.id, { targetBpm: 240 });
    if (!sped.ok) throw new Error(sped.reason);
    engine.play(sped.project);
    expect(host.sources).toHaveLength(1);
    expect(host.sources[0]!.playbackRate.value).toBe(2);
    expect(host.sources[0]!.stopped).toBe(false);
    expect(host.stretches).toHaveLength(1);

    const pitched = setTrackPitch(sped.project, track.id, { semitones: 3, cents: 0 });
    if (!pitched.ok) throw new Error(pitched.reason);
    engine.sync(pitched.project);
    expect(host.sources.filter((source) => !source.stopped)).toHaveLength(1);
    expect(host.sources).toHaveLength(1);
    expect(host.stretches[0]!.applied?.pitchSemitones).toBe(3);
    expect(host.stretches[0]!.applied?.playbackRate).toBe(2);
  });

  it("rebuilds when tracks leave identity, then updates further tempo in place", () => {
    const host = new LiveHost();
    const engine = createStudioPlaybackEngine({ host });
    const first = projectWithClip({ seconds: 8 });
    const second = addImportedFileAsTrack(first.project, imported("bass.wav", 8), "desktop");
    if (!second.ok) throw new Error(second.reason);
    second.project.tracks[1]!.clips[0]!.buffer = makeBuffer(80, 10, 0.4);
    engine.play(second.project);
    expect(host.sources).toHaveLength(2);
    expect(host.stretches).toHaveLength(0);
    host.currentTime = 1.5;

    const pitched = setTrackPitch(second.project, second.project.tracks[0]!.id, { semitones: 5, cents: 20 });
    if (!pitched.ok) throw new Error("pitch");
    const tempo = setTrackTempo(pitched.project, second.project.tracks[1]!.id, { targetBpm: 180 });
    if (!tempo.ok) throw new Error("tempo");
    engine.sync(tempo.project);
    expect(host.stretches).toHaveLength(2);
    expect(host.sources.filter((source) => !source.stopped)).toHaveLength(2);
    const voicesBefore = host.sources.length;
    const faster = setTrackTempo(tempo.project, second.project.tracks[1]!.id, { targetBpm: 240 });
    if (!faster.ok) throw new Error("tempo");
    const gained = setTrackGain(faster.project, second.project.tracks[0]!.id, -6);
    if (!gained.ok) throw new Error("gain");
    engine.sync(gained.project);
    expect(host.sources).toHaveLength(voicesBefore);
    const living = host.sources.filter((source) => !source.stopped);
    expect(living).toHaveLength(2);
    expect(living.some((source) => source.playbackRate.value === 2)).toBe(true);
    expect(host.stretches.some((node) => node.applied?.pitchSemitones === 5.2)).toBe(true);
    expect(engine.poll().status).toBe("playing");
  });

  it("re-arms into a live stretch when tempo leaves identity behind the playhead", () => {
    const host = new LiveHost();
    const engine = createStudioPlaybackEngine({ host });
    const { project, track } = projectWithClip({ seconds: 8 });
    engine.play(project);
    expect(host.stretches).toHaveLength(0);
    host.currentTime = 1;
    const sped = setTrackTempo(project, track.id, { targetBpm: 240 });
    if (!sped.ok) throw new Error("tempo");
    engine.sync(sped.project);
    const live = host.sources.filter((source) => !source.stopped);
    expect(live).toHaveLength(1);
    expect(live[0]!.playbackRate.value).toBe(2);
    expect(host.stretches).toHaveLength(1);
    expect(engine.currentPlayhead()).toBeCloseTo(1, 5);
    expect(engine.poll().status).toBe("playing");
  });

  it("rebuilds when a trim changes the arrangement and keeps a later gain on the same voice", () => {
    const host = new StripHost();
    host.currentTime = 0;
    const engine = createStudioPlaybackEngine({ host });
    const { project, track } = projectWithClip({ seconds: 8 });
    const clip = track.clips[0]!;
    engine.play(project);
    host.currentTime = 1;
    const trimmed = setClipTrim(project, track.id, clip.id, { trimEndSec: 6 });
    if (!trimmed.ok) throw new Error("trim");
    engine.sync(trimmed.project);
    expect(host.sources.length).toBeGreaterThan(1);
    const gained = setTrackGain(trimmed.project, track.id, 3);
    const panned = gained.ok ? setTrackPan(gained.project, track.id, -0.4) : gained;
    if (!panned.ok) throw new Error("mix");
    const voices = host.sources.length;
    host.currentTime = 2;
    engine.sync(panned.project);
    expect(host.sources).toHaveLength(voices);
    expect(host.panners[0]!.pan.value).toBe(-0.4);
    expect(host.gains[1]!.gain.value).toBeCloseTo(10 ** (3 / 20), 5);
  });

  it("places the fade gain before the live stretcher, then eq, compressor, and pan", () => {
    const host = new LiveStripHost();
    const engine = createStudioPlaybackEngine({ host });
    const { project, track } = projectWithClip({ seconds: 8 });
    const sped = setTrackTempo(project, track.id, { targetBpm: 240 });
    if (!sped.ok) throw new Error(sped.reason);
    engine.play(sped.project);
    const source = host.sources[0]!;
    const stretch = host.stretches[0]!;
    const fadeGain = source.links[0] as MeterGain;
    expect(fadeGain).toBe(host.gains[2]);
    expect(fadeGain.links[0]).toBe(stretch);
    expect(stretch.links[0]).toBe(host.biquads[0]);
    expect(host.biquads[2]!.links[0]).toBe(host.compressors[0]);
    expect(host.compressors[0]!.links[0]).toBe(host.panners[0]);
    expect(host.panners[0]!.links[0]).toBe(host.gains[1]);
  });

  it("does not open a worklet for identity tracks", () => {
    const host = new FakeHost();
    let created = 0;
    (host as FakeHost & { createLiveStretch(): StudioLiveStretch }).createLiveStretch = () => {
      created += 1;
      return new FakeStretch();
    };
    const engine = createStudioPlaybackEngine({ host });
    const { project } = projectWithClip({ seconds: 1.5 });
    engine.play(project);
    expect(created).toBe(0);
    expect(engine.currentStatus()).toBe("playing");
    expect(host.sources.filter((source) => source.started)).toHaveLength(1);
  });

  it("arms ten identity tracks without any live stretch nodes", () => {
    const host = new LiveHost();
    const engine = createStudioPlaybackEngine({ host });
    let project = createStudioProject("Ten", "project-ten");
    for (let index = 0; index < 10; index += 1) {
      const added = addImportedFileAsTrack(project, imported(`n${index}.wav`, 2), "desktop");
      if (!added.ok) throw new Error(added.reason);
      project = added.project;
      project.tracks[index]!.clips[0]!.buffer = makeBuffer(20, 10, 0.2);
    }
    engine.play(project);
    expect(engine.currentStatus()).toBe("playing");
    expect(host.sources.filter((source) => source.started && !source.stopped)).toHaveLength(10);
    expect(host.stretches).toHaveLength(0);
  });

  it("falls back when the worklet cannot be created for a non-identity track", () => {
    const host = new FakeHost();
    const failed: string[] = [];
    (host as FakeHost & { createLiveStretch(): StudioLiveStretch }).createLiveStretch = () => {
      throw new Error("SoundTouch worklet is not registered");
    };
    const engine = createStudioPlaybackEngine({
      host,
      onLiveStretchFailed: () => failed.push("fallback"),
    });
    const { project, track } = projectWithClip({ seconds: 1.5 });
    const plain = addImportedFileAsTrack(project, imported("keep.wav", 1.5), "desktop");
    if (!plain.ok) throw new Error(plain.reason);
    plain.project.tracks[1]!.clips[0]!.buffer = makeBuffer(15, 10, 0.2);
    const sped = setTrackTempo(plain.project, track.id, { targetBpm: 240 });
    if (!sped.ok) throw new Error(sped.reason);
    engine.play(sped.project);
    expect(failed).toEqual(["fallback"]);
    expect(engine.currentStatus()).toBe("playing");
    const started = host.sources.filter((source) => source.started);
    expect(started).toHaveLength(1);
    expect(started[0]!.playbackRate.value).toBe(1);
  });

  it("falls back when connecting into the worklet throws", () => {
    const host = new StrictHost();
    const seen: string[] = [];
    const engine = createStudioPlaybackEngine({
      host,
      onTransport: (snapshot) => seen.push(snapshot.status),
      onLiveStretchFailed: () => seen.push("fallback"),
    });
    const { project, track } = projectWithClip({ seconds: 1.5 });
    const plain = addImportedFileAsTrack(project, imported("keep.wav", 1.5), "desktop");
    if (!plain.ok) throw new Error(plain.reason);
    plain.project.tracks[1]!.clips[0]!.buffer = makeBuffer(15, 10, 0.2);
    const sped = setTrackTempo(plain.project, track.id, { targetBpm: 240 });
    if (!sped.ok) throw new Error(sped.reason);
    engine.play(sped.project);
    expect(engine.currentStatus()).toBe("playing");
    expect(seen).toContain("fallback");
    expect(seen.at(-1)).toBe("playing");
    const started = host.sources.filter((source) => source.started);
    expect(started).toHaveLength(1);
    expect(started[0]!.playbackRate.value).toBe(1);
  });
});

class StrictGain implements StudioGainNode {
  gain = { value: 1 };
  links: StudioAudioNode[] = [];
  connect(destination: StudioAudioNode) {
    if ((destination as { bad?: boolean }).bad) {
      throw new TypeError("Failed to execute 'connect' on 'AudioNode': Overload resolution failed.");
    }
    this.links.push(destination);
  }
  disconnect() {
    this.links = [];
  }
}

class StrictHost extends FakeHost {
  createGain() {
    return new StrictGain() as unknown as FakeGain;
  }
  createLiveStretch(): StudioLiveStretch {
    const input: StudioAudioNode & { bad?: boolean } = {
      bad: true,
      connect() {},
      disconnect() {},
    };
    return {
      input,
      connect() {},
      disconnect() {},
      apply() {},
    };
  }
}

class LinkedNode implements StudioAudioNode {
  links: StudioAudioNode[] = [];
  connect(destination: StudioAudioNode) {
    this.links.push(destination);
  }
  disconnect() {
    this.links = [];
  }
}

class MeterGain extends LinkedNode implements StudioGainNode {
  gain = { value: 1 };
}

class MeterAnalyser extends LinkedNode implements StudioAnalyserNode {
  fftSize = 8;
  smoothingTimeConstant = 0;
  samples = new Float32Array(8);
  getFloatTimeDomainData(array: Float32Array) {
    array.set(this.samples.subarray(0, array.length));
  }
}

class MeterSource extends LinkedNode implements StudioBufferSource {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  start() {}
  stop() {}
}

class StripParam extends LinkedNode {
  type: BiquadFilterType = "lowshelf";
  pan = { value: 0 };
  frequency = { value: 0 };
  gain = { value: 0 };
  Q = { value: 1 };
  threshold = { value: 0 };
  knee = { value: 0 };
  ratio = { value: 1 };
  attack = { value: 0 };
  release = { value: 0 };
}

class StripHost implements StudioAudioHost {
  currentTime = 0;
  state: AudioContextState = "running";
  destination: StudioAudioNode = new LinkedNode();
  gains: MeterGain[] = [];
  analysers: MeterAnalyser[] = [];
  biquads: StripParam[] = [];
  compressors: StripParam[] = [];
  panners: StripParam[] = [];
  sources: MeterSource[] = [];
  async resume() {}
  async close() {}
  createGain() {
    const gain = new MeterGain();
    this.gains.push(gain);
    return gain;
  }
  createAnalyser() {
    const analyser = new MeterAnalyser();
    this.analysers.push(analyser);
    return analyser;
  }
  createBiquadFilter() {
    const node = new StripParam();
    this.biquads.push(node);
    return node;
  }
  createDynamicsCompressor() {
    const node = new StripParam();
    this.compressors.push(node);
    return node;
  }
  createStereoPanner() {
    const node = new StripParam();
    this.panners.push(node);
    return node;
  }
  createBufferSource() {
    const source = new MeterSource();
    this.sources.push(source);
    return source;
  }
}

class LinkedStretch extends LinkedNode implements StudioLiveStretch {
  readonly input: StudioAudioNode = this;
  applied: LiveStretchParams | null = null;
  apply(params: LiveStretchParams) {
    this.applied = params;
  }
}

class LiveStripHost extends StripHost {
  stretches: LinkedStretch[] = [];
  createLiveStretch() {
    const node = new LinkedStretch();
    this.stretches.push(node);
    return node;
  }
}

class MeterHost implements StudioAudioHost {
  currentTime = 0;
  state: AudioContextState = "running";
  destination: StudioAudioNode = new LinkedNode();
  gains: MeterGain[] = [];
  analysers: MeterAnalyser[] = [];
  async resume() {}
  async close() {}
  createGain() {
    const gain = new MeterGain();
    this.gains.push(gain);
    return gain;
  }
  createAnalyser() {
    const analyser = new MeterAnalyser();
    this.analysers.push(analyser);
    return analyser;
  }
  createBufferSource() {
    return new MeterSource();
  }
}

describe("tempo preview", () => {
  it("skips an unchanged track and trims before processing", async () => {
    const seen: number[] = [];
    const preview = createTempoPitchPreview({
      createBuffer,
      processClip: async ({ buffer }) => {
        seen.push(buffer.length);
        return buffer;
      },
    });
    const identity = projectWithClip({ seconds: 1 });
    expect(await preview.renderTrack(identity.track)).toBeNull();
    expect(seen).toEqual([]);

    const trimmed = projectWithClip({ trimStartSec: 0.2, trimEndSec: 0.5, seconds: 1 });
    const sped = setTrackTempo(trimmed.project, trimmed.track.id, { targetBpm: 240 });
    if (!sped.ok) throw new Error(sped.reason);
    const changed = sped.project.tracks[0]!;
    changed.clips[0]!.buffer = makeBuffer(10, 10, 0.2);
    const rendered = await preview.renderTrack(changed);
    expect(seen).toEqual([3]);
    expect(rendered?.duration).toBeCloseTo(0.3, 5);
  });

  it("mixes cooperatively to the same samples as the synchronous mix", async () => {
    const clips = [
      { buffer: makeBuffer(10, 10, 0.25), heardOffsetSec: 0 },
      { buffer: makeBuffer(5, 10, 1), heardOffsetSec: 0.5 },
    ];
    const sync = mixHeardBuffers(clips, createBuffer);
    const asyncMix = await mixHeardBuffersCooperative(clips, createBuffer, undefined, 4);
    expect(asyncMix?.length).toBe(sync?.length);
    expect(Array.from(asyncMix?.getChannelData(0) ?? [])).toEqual(Array.from(sync?.getChannelData(0) ?? []));
  });

  it("sums overlapping clips at their heard offsets", () => {
    const mixed = mixHeardBuffers(
      [
        { buffer: makeBuffer(10, 10, 0.25), heardOffsetSec: 0 },
        { buffer: makeBuffer(5, 10, 1), heardOffsetSec: 0.5 },
      ],
      createBuffer,
    );
    expect(mixed?.duration).toBeCloseTo(1, 5);
    expect(mixed?.getChannelData(0)[0]).toBeCloseTo(0.25, 5);
    expect(mixed?.getChannelData(0)[5]).toBeCloseTo(1.25, 5);
  });

  it("stretches a clip with SoundTouch and keeps the heard length", async () => {
    const source = makeBuffer(8000, 16000, 0.5);
    const { project, track } = projectWithClip();
    const sped = setTrackTempo(project, track.id, { targetBpm: 240 });
    if (!sped.ok) throw new Error(sped.reason);
    const changed = sped.project.tracks[0]!;
    const process = createSoundTouchClipProcessor({ createBuffer });
    const result = await process({ buffer: source, track: changed, signal: new AbortController().signal });
    expect(result.sampleRate).toBe(16000);
    expect(result.length).toBe(4000);
    expect(result.duration).toBeCloseTo(0.25, 5);
  });

  it("waits out the debounce and lets an unchanged track skip it", async () => {
    vi.useFakeTimers();
    const results: Array<[string, AudioBuffer | null]> = [];
    const rendered = makeBuffer(4, 10, 0.2);
    const scheduler = createTempoPreviewScheduler({
      debounceMs: qviStudioLimits.previewDebounceMs,
      preview: { renderTrack: async () => rendered },
      onResult: (trackId, buffer) => results.push([trackId, buffer]),
    });
    const { project, track } = projectWithClip();
    const sped = setTrackTempo(project, track.id, { targetBpm: 240 });
    if (!sped.ok) throw new Error(sped.reason);
    const changed = sped.project.tracks[0]!;
    scheduler.schedule(changed);
    await vi.advanceTimersByTimeAsync(699);
    expect(results).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(results).toEqual([[changed.id, rendered]]);

    const identity = projectWithClip();
    const connected = connectTempoPreview({
      preview: { renderTrack: async () => rendered },
      setRenderedTrack: (trackId, buffer) => results.push([trackId, buffer]),
    });
    connected.schedule(identity.track);
    expect(results.at(-1)).toEqual([identity.track.id, null]);
    scheduler.dispose();
    connected.dispose();
  });

  it("renders each changed track and only one ffmpeg job at a time", async () => {
    vi.useFakeTimers();
    const results: string[] = [];
    let active = 0;
    let maxActive = 0;
    const first = projectWithClip();
    const second = projectWithClip();
    const spedA = setTrackTempo(first.project, first.track.id, { targetBpm: 160 });
    const spedB = setTrackTempo(second.project, second.track.id, { targetBpm: 180 });
    if (!spedA.ok || !spedB.ok) throw new Error("tempo");
    const scheduler = createTempoPreviewScheduler({
      debounceMs: qviStudioLimits.previewDebounceMs,
      preview: {
        renderTrack: async (track) => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await Promise.resolve();
          active -= 1;
          results.push(track.id);
          return makeBuffer(4, 10, 0.2);
        },
      },
      onResult: () => undefined,
    });
    scheduler.schedule(spedA.project.tracks[0]!);
    scheduler.schedule(spedB.project.tracks[0]!);
    await vi.advanceTimersByTimeAsync(qviStudioLimits.previewDebounceMs);
    expect(results).toEqual([spedA.project.tracks[0]!.id, spedB.project.tracks[0]!.id]);
    expect(maxActive).toBe(1);
    scheduler.dispose();
  });
});

describe("load studio file", () => {
  it("decodes a supported file and refuses the others", async () => {
    let decoded = 0;
    const buffer = makeBuffer(20, 10, 0.3);
    const loaded = await loadStudioFile(new File([new Uint8Array(8)], "song.wav", { type: "audio/wav" }), async () => {
      decoded += 1;
      return buffer;
    });
    expect(decoded).toBe(1);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.file.sourceDurationSec).toBe(2);
    expect(loaded.file.peaks).toHaveLength(640);
    expect(loaded.warning).toBeNull();

    const refused = await loadStudioFile(new File(["x"], "notes.txt"), async () => {
      decoded += 1;
      return buffer;
    });
    expect(refused).toEqual({ ok: false, reason: "unsupported-file" });
    expect(decoded).toBe(1);

    const failed = await loadStudioFile(new File([new Uint8Array(4)], "bad.wav"), async () => {
      throw new Error("decode");
    });
    expect(failed).toEqual({ ok: false, reason: "decode-failed" });
  });

  it("warns when the file reaches the large-file limit", async () => {
    const file = {
      name: "big.wav",
      size: FFMPEG_LARGE_FILE_BYTES,
      type: "audio/wav",
      arrayBuffer: async () => new ArrayBuffer(8),
    } as File;
    const loaded = await loadStudioFile(file, async () => makeBuffer(10, 10));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.warning).toBe("large-file");
  });
});

describe("wav preview encoding", () => {
  it("writes a 16-bit pcm header at the buffer sample rate", () => {
    const bytes = encodeWavPcm16(makeBuffer(4, 8000, 0));
    expect(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!)).toBe("RIFF");
    expect(new DataView(bytes.buffer).getUint32(24, true)).toBe(8000);
    expect(new DataView(bytes.buffer).getUint16(34, true)).toBe(16);
  });
});
