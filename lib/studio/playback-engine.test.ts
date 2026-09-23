import { afterEach, describe, expect, it, vi } from "vitest";
import { FFMPEG_LARGE_FILE_BYTES } from "@/lib/ffmpeg";
import { loadStudioFile } from "@/lib/studio/load-clip";
import {
  createStudioPlaybackEngine,
  type StudioAudioHost,
  type StudioAudioNode,
  type StudioBufferSource,
  type StudioGainNode,
} from "@/lib/studio/playback-engine";
import { dbToGain, planPlayback } from "@/lib/studio/playback-schedule";
import {
  addImportedFileAsTrack,
  createStudioProject,
  setMasterGain,
  setTrackGain,
  setTrackMuted,
  setTrackSolo,
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
});

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
    expect(loaded.file.peaks).toHaveLength(180);
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
