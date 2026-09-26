/**
 * Live QVI Studio playback.
 *
 * Web Audio schedules the plan from `playback-schedule`. When the host can
 * create a SoundTouch worklet, every audible clip plays through it. Pitch,
 * tempo, gain, pan, and EQ write AudioParams on the voices already running.
 * They do not stop those voices, and they do not stretch the whole clip on
 * this thread. Without a worklet, a rendered track buffer is used once the
 * offline preview has one.
 * AnalyserNodes sit after the track and master gains so the console can read
 * peaks. They do not change the mix.
 * When the host can build them, each playing track is
 * source → fade → SoundTouch worklet → EQ → compressor → pan → gain.
 * The fade connects to the worklet node (`input`), not the wrapper object.
 * If that node cannot be created or connected, the same clip plays as a plain
 * buffer and the transport still starts.
 * Export does not use this graph.
 */

import { liveStretchParams, type LiveStretchParams } from "@/lib/audio-stretch-live";
import { resolveTempoRate } from "@/lib/audio-tempo";
import type { StudioEngineStatus, StudioPlaybackEngine } from "@/lib/studio/engine";
import { clipFadeRamps } from "@/lib/studio/fades";
import { loadStudioFile, type StudioDecodeResult } from "@/lib/studio/load-clip";
import { peakFromTimeDomain, type StudioMeterReading } from "@/lib/studio/meters";
import { compressorFromAmount, STUDIO_EQ_FREQUENCIES } from "@/lib/studio/mix";
import { playbackArrangementKey, planPlayback } from "@/lib/studio/playback-schedule";
import { canPlayStudioProject, projectDuration } from "@/lib/studio/project";
import type { StudioClip, StudioProject, StudioTrack } from "@/lib/studio/types";

export interface StudioAudioNode {
  connect(destination: StudioAudioNode): void;
  disconnect(): void;
}

export interface StudioGainNode extends StudioAudioNode {
  gain: {
    value: number;
    setValueAtTime?(value: number, time: number): void;
    linearRampToValueAtTime?(value: number, time: number): void;
    cancelScheduledValues?(time: number): void;
  };
}

/** Pass-through tap. Peak meters read this; it does not change the mix. */
export interface StudioAnalyserNode extends StudioAudioNode {
  fftSize: number;
  smoothingTimeConstant: number;
  getFloatTimeDomainData(array: Float32Array): void;
}

export interface StudioPannerNode extends StudioAudioNode {
  pan: { value: number };
}

export interface StudioBiquadNode extends StudioAudioNode {
  type: BiquadFilterType;
  frequency: { value: number };
  gain: { value: number };
  Q: { value: number };
}

export interface StudioCompressorNode extends StudioAudioNode {
  threshold: { value: number };
  knee: { value: number };
  ratio: { value: number };
  attack: { value: number };
  release: { value: number };
}

export interface StudioBufferSource extends StudioAudioNode {
  buffer: AudioBuffer | null;
  /** Present on real buffer sources. Tempo sets this for the live worklet path. */
  playbackRate?: { value: number };
  onended: (() => void) | null;
  start(when?: number, offset?: number, duration?: number): void;
  stop(when?: number): void;
}

/**
 * Main-thread view of one SoundTouch worklet. `apply` must not run on the audio thread.
 * `input` is the node a clip connects into. The wrapper itself is not an AudioNode.
 */
export interface StudioLiveStretch extends StudioAudioNode {
  input: StudioAudioNode;
  apply(params: LiveStretchParams): void;
}

export interface StudioAudioHost {
  currentTime: number;
  state: AudioContextState;
  destination: StudioAudioNode;
  resume(): Promise<void>;
  close(): Promise<void>;
  createGain(): StudioGainNode;
  createBufferSource(): StudioBufferSource;
  createAnalyser?(): StudioAnalyserNode;
  createStereoPanner?(): StudioPannerNode;
  createBiquadFilter?(): StudioBiquadNode;
  createDynamicsCompressor?(): StudioCompressorNode;
  createBuffer?(channels: number, length: number, sampleRate: number): AudioBuffer;
  decodeAudioData?(data: ArrayBuffer): Promise<AudioBuffer>;
  /** When set, tempo and pitch play through the worklet instead of a baked buffer. */
  createLiveStretch?: () => StudioLiveStretch | null;
}

export type StudioTransportSnapshot = {
  status: StudioEngineStatus;
  playheadSec: number;
};

type TrackStrip = {
  input: StudioAudioNode;
  gain: StudioGainNode;
  low?: StudioBiquadNode;
  mid?: StudioBiquadNode;
  high?: StudioBiquadNode;
  compressor?: StudioCompressorNode;
  pan?: StudioPannerNode;
  nodes: StudioAudioNode[];
};

type PlayingVoice = {
  trackId: string;
  clipId: string | null;
  source: StudioBufferSource;
  fade: StudioGainNode;
};

export class QviStudioPlaybackEngine implements StudioPlaybackEngine {
  private readonly host: StudioAudioHost;
  private readonly onTransport?: (snapshot: StudioTransportSnapshot) => void;
  private readonly onLiveStretchFailed?: () => void;
  private readonly master: StudioGainNode;
  private readonly trackGains = new Map<string, StudioGainNode>();
  private readonly strips = new Map<string, TrackStrip>();
  private readonly trackAnalysers = new Map<string, StudioAnalyserNode>();
  private masterAnalyser: StudioAnalyserNode | null = null;
  private meterScratch = new Float32Array(256);
  private readonly rendered = new Map<string, AudioBuffer>();
  private voices: PlayingVoice[] = [];
  private readonly stretchByTrack = new Map<string, StudioLiveStretch>();
  private readonly stretchParamKey = new Map<string, string>();
  private armedKey = "";
  private armedLive = false;
  private liveBroken = false;
  private armedFadeKey = "";
  /** Heard end used while playing, so a faster tempo does not cut the take off. */
  private horizonSec = 0;
  private activeProject: StudioProject | null = null;
  private status: StudioEngineStatus = "idle";
  private playheadSec = 0;
  private anchorContextTime = 0;
  private anchorPlayhead = 0;
  private disposed = false;

  constructor(
    host: StudioAudioHost,
    onTransport?: (snapshot: StudioTransportSnapshot) => void,
    onLiveStretchFailed?: () => void,
  ) {
    this.host = host;
    this.onTransport = onTransport;
    this.onLiveStretchFailed = onLiveStretchFailed;
    this.master = host.createGain();
    this.master.gain.value = 1;
    this.connectTap(this.master, host.destination, null);
  }

  readMeters(): StudioMeterReading {
    const tracks: Record<string, number> = {};
    this.trackAnalysers.forEach((analyser, trackId) => {
      tracks[trackId] = this.levelOf(analyser);
    });
    return {
      master: this.masterAnalyser ? this.levelOf(this.masterAnalyser) : 0,
      tracks,
    };
  }

  currentStatus(): StudioEngineStatus {
    return this.status;
  }

  currentPlayhead(): number {
    if (this.status !== "playing") return this.playheadSec;
    return Math.min(this.playheadEnd(), Math.max(0, this.wallPlayhead()));
  }

  poll(): StudioTransportSnapshot {
    if (this.status === "playing" && this.activeProject) {
      const playhead = this.wallPlayhead();
      if (playhead >= this.playheadEnd()) {
        this.stopSources();
        this.status = "paused";
        this.playheadSec = this.playheadEnd();
        this.emit();
      } else {
        this.playheadSec = playhead;
      }
    }
    return { status: this.status, playheadSec: this.playheadSec };
  }

  setRenderedTrack(trackId: string, buffer: AudioBuffer | null): void {
    if (this.disposed || this.liveStretchEnabled()) return;
    if (buffer) this.rendered.set(trackId, buffer);
    else this.rendered.delete(trackId);
    if (this.status === "playing" && this.activeProject) {
      this.armGuarded(this.activeProject, this.currentPlayhead());
      this.emit();
    }
  }

  async loadFile(file: File): Promise<StudioDecodeResult> {
    const decode = this.host.decodeAudioData?.bind(this.host);
    if (!decode) return { ok: false, reason: "decode-failed" };
    return loadStudioFile(file, decode);
  }

  async resumeFromUserGesture(): Promise<void> {
    if (this.disposed || this.host.state === "closed") return;
    await this.host.resume();
  }

  play(project: StudioProject): void {
    if (this.disposed) return;
    this.activeProject = project;
    const duration = projectDuration(project);
    const playhead = clampTime(project.playheadSec, duration);
    this.playheadSec = playhead;
    if (!canPlayStudioProject(project) || playhead >= duration) {
      this.stopSources();
      this.status = duration > 0 ? "paused" : "idle";
      this.emit();
      return;
    }
    this.status = "playing";
    this.armGuarded(project, playhead);
    this.emit();
  }

  pause(): void {
    if (this.disposed || this.status !== "playing") return;
    this.playheadSec = this.currentPlayhead();
    this.status = "paused";
    this.stopSources();
    this.emit();
  }

  stop(): void {
    if (this.disposed) return;
    this.stopSources();
    this.status = "idle";
    this.playheadSec = 0;
    this.emit();
  }

  seek(playheadSec: number): void {
    if (this.disposed) return;
    const duration = this.activeProject ? projectDuration(this.activeProject) : Number.POSITIVE_INFINITY;
    this.playheadSec = clampTime(playheadSec, duration);
    if (this.status === "playing" && this.activeProject) this.armGuarded(this.activeProject, this.playheadSec);
    this.emit();
  }

  sync(project: StudioProject): void {
    if (this.disposed) return;
    this.activeProject = project;
    if (this.status !== "playing") {
      this.playheadSec = clampTime(project.playheadSec, projectDuration(project));
      this.applyGains(project);
      this.emit();
      return;
    }
    const playhead = this.currentPlayhead();
    if (playbackArrangementKey(project) !== this.armedKey || this.needsLiveGraph()) {
      this.armGuarded(project, playhead);
      this.emit();
      return;
    }
    this.applyPerformance(project);
    this.emit();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopSources();
    this.dropStretchNodes();
    this.status = "idle";
    this.strips.forEach((strip) => this.disconnectStrip(strip));
    this.strips.clear();
    this.trackGains.clear();
    this.trackAnalysers.forEach((node) => disconnectQuiet(node));
    this.trackAnalysers.clear();
    if (this.masterAnalyser) disconnectQuiet(this.masterAnalyser);
    this.masterAnalyser = null;
    disconnectQuiet(this.master);
    void this.host.close().catch(() => undefined);
  }

  private wallPlayhead(): number {
    return this.anchorPlayhead + (this.host.currentTime - this.anchorContextTime);
  }

  /** Heard end while playing. A faster tempo must not cut off audio that already started. */
  private playheadEnd(): number {
    const duration = this.activeProject ? projectDuration(this.activeProject) : 0;
    return Math.max(duration, this.horizonSec);
  }

  private liveStretchEnabled(): boolean {
    return !this.liveBroken && typeof this.host.createLiveStretch === "function";
  }

  private planFor(project: StudioProject, playhead: number) {
    return planPlayback({
      project,
      playheadSec: playhead,
      renderedTracks: this.rendered,
      live: this.liveStretchEnabled(),
    });
  }

  private needsLiveGraph(): boolean {
    return this.liveStretchEnabled() && !this.armedLive;
  }

  /**
   * A failed worklet must not leave the transport stuck. Drop live stretch and
   * arm the same clips as plain buffers. The second attempt is the fallback.
   */
  private armGuarded(project: StudioProject, playhead: number): void {
    try {
      this.arm(project, playhead);
    } catch {
      if (this.liveStretchEnabled()) {
        this.failLive();
        this.stopSources();
        this.dropStretchNodes();
        try {
          this.arm(project, playhead);
          return;
        } catch {
          /* plain graph failed too */
        }
      }
      this.stopSources();
      if (this.status === "playing") this.status = "paused";
    }
  }

  private failLive(): void {
    if (this.liveBroken) return;
    this.liveBroken = true;
    this.armedLive = false;
    try {
      this.onLiveStretchFailed?.();
    } catch {
      /* the session still plays without the worklet */
    }
  }

  private arm(project: StudioProject, playhead: number): void {
    this.stopSources();
    this.anchorContextTime = this.host.currentTime;
    this.anchorPlayhead = playhead;
    this.playheadSec = playhead;
    const plan = this.planFor(project, playhead);
    this.armedKey = playbackArrangementKey(project);
    this.armedLive = this.liveStretchEnabled();
    this.armedFadeKey = this.fadeSignature(project);
    this.horizonSec = projectDuration(project);
    this.stretchParamKey.clear();
    this.master.gain.value = plan.masterGain;
    this.retainStrips(new Set(project.tracks.map((track) => track.id)));
    const whenBase = this.host.currentTime;
    const playingTracks = new Set<string>();
    for (const event of plan.events) {
      const track = project.tracks.find((item) => item.id === event.trackId);
      const source = this.host.createBufferSource();
      source.buffer = event.buffer;
      const input = this.trackInput(track ?? { id: event.trackId }, gainFor(plan.trackGains, event.trackId));
      const fadeGain = this.host.createGain();
      const heardSlice =
        event.playbackRate > 0 && event.stretch ? event.durationSec / event.playbackRate : event.durationSec;
      const envelope = clipFadeRamps({
        heardDurationSec: event.clipHeardDurationSec,
        fromHeardSec: event.fromHeardSec,
        sliceHeardSec: heardSlice,
        fadeInSec: event.fadeInSec,
        fadeOutSec: event.fadeOutSec,
      });
      const startAt = whenBase + event.delaySec;
      this.applyFadeEnvelope(fadeGain, startAt, envelope.initialGain, envelope.ramps);
      const stretch = event.stretch ? this.ensureStretch(event.trackId, event.stretch, input) : null;
      source.connect(fadeGain);
      if (stretch) {
        try {
          fadeGain.connect(stretch.input);
          if (source.playbackRate) source.playbackRate.value = event.playbackRate;
        } catch {
          this.retireStretch(event.trackId);
          throw new Error("studio-live-stretch");
        }
      } else {
        fadeGain.connect(input);
      }
      source.start(whenBase + event.delaySec, event.offsetSec, event.durationSec);
      this.voices.push({ trackId: event.trackId, clipId: event.clipId, source, fade: fadeGain });
      playingTracks.add(event.trackId);
      if (event.stretch) this.stretchParamKey.set(event.trackId, stretchParamKey(event.stretch));
    }
    this.stretchByTrack.forEach((node, trackId) => {
      if (playingTracks.has(trackId)) return;
      try {
        node.disconnect();
      } catch {
        /* already disconnected */
      }
      this.stretchByTrack.delete(trackId);
    });
    for (const track of project.tracks) {
      if (playingTracks.has(track.id)) continue;
      this.trackInput(track, gainFor(plan.trackGains, track.id));
    }
  }

  private applyFadeEnvelope(
    gain: StudioGainNode,
    startAt: number,
    initialGain: number,
    ramps: { atSec: number; gain: number }[],
  ): void {
    const param = gain.gain;
    if (typeof param.cancelScheduledValues === "function") param.cancelScheduledValues(startAt);
    if (typeof param.setValueAtTime === "function") param.setValueAtTime(initialGain, startAt);
    else param.value = initialGain;
    for (const ramp of ramps) {
      const when = startAt + Math.max(0, ramp.atSec);
      if (typeof param.linearRampToValueAtTime === "function") param.linearRampToValueAtTime(ramp.gain, when);
      else param.value = ramp.gain;
    }
  }

  private ensureStretch(trackId: string, params: LiveStretchParams, destination: StudioAudioNode): StudioLiveStretch | null {
    let node = this.stretchByTrack.get(trackId);
    if (!node) {
      let created: StudioLiveStretch | null = null;
      try {
        created = this.host.createLiveStretch?.() ?? null;
        if (!created?.input) throw new Error("studio-live-stretch");
        created.connect(destination);
        created.apply(params);
      } catch (error) {
        if (created) disconnectQuiet(created);
        if (error instanceof Error && error.message === "studio-live-stretch") throw error;
        throw new Error("studio-live-stretch");
      }
      node = created;
      this.stretchByTrack.set(trackId, node);
      return node;
    }
    try {
      node.apply(params);
    } catch {
      this.retireStretch(trackId);
      throw new Error("studio-live-stretch");
    }
    return node;
  }

  private retireStretch(trackId: string): void {
    const node = this.stretchByTrack.get(trackId);
    if (!node) return;
    disconnectQuiet(node);
    this.stretchByTrack.delete(trackId);
    this.stretchParamKey.delete(trackId);
  }

  private applyPerformance(project: StudioProject): void {
    this.applyGains(project);
    this.horizonSec = Math.max(this.horizonSec, projectDuration(project), this.currentPlayhead());
    if (this.armedLive) this.applyStretchParams(project);
    this.applyFadeUpdates(project);
  }

  private applyStretchParams(project: StudioProject): void {
    const paramsByTrack = new Map<string, LiveStretchParams>();
    for (const track of project.tracks) {
      paramsByTrack.set(
        track.id,
        liveStretchParams({
          tempoRate: resolveTempoRate(track.tempo),
          semitones: track.pitchSemitones,
          cents: track.pitchCents,
          preset: track.stretchPreset,
        }),
      );
    }
    for (const voice of this.voices) {
      const params = paramsByTrack.get(voice.trackId);
      const stretch = this.stretchByTrack.get(voice.trackId);
      if (!params || !stretch) continue;
      if (voice.source.playbackRate) voice.source.playbackRate.value = params.playbackRate;
      const key = stretchParamKey(params);
      if (this.stretchParamKey.get(voice.trackId) === key) continue;
      this.stretchParamKey.set(voice.trackId, key);
      try {
        stretch.apply(params);
      } catch {
        this.failLive();
        if (this.activeProject && this.status === "playing") {
          this.armGuarded(this.activeProject, this.currentPlayhead());
        }
        return;
      }
    }
  }

  private applyFadeUpdates(project: StudioProject): void {
    const next = this.fadeSignature(project);
    if (next === this.armedFadeKey) return;
    this.armedFadeKey = next;
    const playhead = this.currentPlayhead();
    const now = this.host.currentTime;
    for (const voice of this.voices) {
      if (!voice.clipId) continue;
      const track = project.tracks.find((item) => item.id === voice.trackId);
      const clip = track?.clips.find((item) => item.id === voice.clipId);
      if (!track || !clip) continue;
      const envelope = fadeEnvelopeForClip(track, clip, playhead, this.armedLive);
      this.applyFadeEnvelope(voice.fade, now, envelope.initialGain, envelope.ramps);
    }
  }

  private fadeSignature(project: StudioProject): string {
    return project.tracks
      .map((track) => {
        const rate = this.armedLive ? resolveTempoRate(track.tempo) : 1;
        return track.clips
          .map((clip) => [clip.id, clip.fadeInSec, clip.fadeOutSec, rate].join(":"))
          .join(",");
      })
      .join("|");
  }

  private applyGains(project: StudioProject): void {
    const plan = this.planFor(project, this.playheadSec);
    this.master.gain.value = plan.masterGain;
    this.retainStrips(new Set(project.tracks.map((track) => track.id)));
    for (const track of project.tracks) {
      this.trackInput(track, gainFor(plan.trackGains, track.id));
    }
  }

  private trackInput(track: Pick<StudioTrack, "id"> & Partial<Pick<StudioTrack, "pan" | "eq" | "compressor">>, linear: number): StudioAudioNode {
    let strip = this.strips.get(track.id);
    if (!strip) strip = this.createStrip(track.id);
    strip.gain.gain.value = linear;
    this.applyStrip(strip, track);
    return strip.input;
  }

  private createStrip(trackId: string): TrackStrip {
    const gain = this.host.createGain();
    const createEq = this.host.createBiquadFilter;
    const createCompressor = this.host.createDynamicsCompressor;
    const createPanner = this.host.createStereoPanner;
    if (!createEq || !createCompressor || !createPanner) {
      this.connectTap(gain, this.master, trackId);
      this.trackGains.set(trackId, gain);
      const plain: TrackStrip = { input: gain, gain, nodes: [gain] };
      this.strips.set(trackId, plain);
      return plain;
    }
    const low = createEq.call(this.host);
    low.type = "lowshelf";
    low.frequency.value = STUDIO_EQ_FREQUENCIES.low;
    const mid = createEq.call(this.host);
    mid.type = "peaking";
    mid.frequency.value = STUDIO_EQ_FREQUENCIES.mid;
    mid.Q.value = 1;
    const high = createEq.call(this.host);
    high.type = "highshelf";
    high.frequency.value = STUDIO_EQ_FREQUENCIES.high;
    const compressor = createCompressor.call(this.host);
    const pan = createPanner.call(this.host);
    low.connect(mid);
    mid.connect(high);
    high.connect(compressor);
    compressor.connect(pan);
    pan.connect(gain);
    this.connectTap(gain, this.master, trackId);
    this.trackGains.set(trackId, gain);
    const strip: TrackStrip = { input: low, gain, low, mid, high, compressor, pan, nodes: [low, mid, high, compressor, pan, gain] };
    this.strips.set(trackId, strip);
    return strip;
  }

  private applyStrip(strip: TrackStrip, track: Partial<Pick<StudioTrack, "pan" | "eq" | "compressor">>): void {
    if (strip.low && strip.mid && strip.high) {
      strip.low.gain.value = track.eq?.lowDb ?? 0;
      strip.mid.gain.value = track.eq?.midDb ?? 0;
      strip.high.gain.value = track.eq?.highDb ?? 0;
    }
    if (strip.compressor) {
      const settings = compressorFromAmount(track.compressor ?? 0);
      strip.compressor.threshold.value = settings.threshold;
      strip.compressor.ratio.value = settings.ratio;
      strip.compressor.knee.value = settings.knee;
      strip.compressor.attack.value = settings.attack;
      strip.compressor.release.value = settings.release;
    }
    if (strip.pan) strip.pan.pan.value = track.pan ?? 0;
  }

  private retainStrips(ids: Set<string>): void {
    const stale: string[] = [];
    this.strips.forEach((_strip, id) => {
      if (!ids.has(id)) stale.push(id);
    });
    for (const id of stale) {
      const strip = this.strips.get(id);
      if (strip) this.disconnectStrip(strip);
      this.strips.delete(id);
      this.trackGains.delete(id);
      const stretch = this.stretchByTrack.get(id);
      if (stretch) {
        disconnectQuiet(stretch);
        this.stretchByTrack.delete(id);
      }
      const analyser = this.trackAnalysers.get(id);
      if (analyser) disconnectQuiet(analyser);
      this.trackAnalysers.delete(id);
    }
  }

  private disconnectStrip(strip: TrackStrip): void {
    for (const node of strip.nodes) disconnectQuiet(node);
  }

  private dropStretchNodes(): void {
    this.stretchByTrack.forEach((node) => {
      try {
        node.disconnect();
      } catch {
        /* already disconnected */
      }
    });
    this.stretchByTrack.clear();
  }

  private stopSources(): void {
    const previous = this.voices;
    this.voices = [];
    for (const voice of previous) {
      voice.source.onended = null;
      try {
        voice.source.stop();
      } catch {
        /* already stopped */
      }
      try {
        voice.source.disconnect();
      } catch {
        /* already disconnected */
      }
      try {
        voice.fade.disconnect();
      } catch {
        /* already disconnected */
      }
    }
  }

  private connectTap(from: StudioAudioNode, to: StudioAudioNode, trackId: string | null): void {
    const create = this.host.createAnalyser;
    if (!create) {
      from.connect(to);
      return;
    }
    const analyser = create.call(this.host);
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0;
    from.connect(analyser);
    analyser.connect(to);
    if (trackId) this.trackAnalysers.set(trackId, analyser);
    else this.masterAnalyser = analyser;
  }

  private levelOf(analyser: StudioAnalyserNode): number {
    const size = analyser.fftSize > 0 ? analyser.fftSize : 256;
    if (this.meterScratch.length < size) this.meterScratch = new Float32Array(size);
    const view = this.meterScratch.subarray(0, size);
    analyser.getFloatTimeDomainData(view);
    return peakFromTimeDomain(view);
  }

  private emit(): void {
    this.onTransport?.({ status: this.status, playheadSec: this.currentPlayhead() });
  }
}

function disconnectQuiet(node: StudioAudioNode): void {
  try {
    node.disconnect();
  } catch {
    /* already disconnected */
  }
}

export function createStudioPlaybackEngine(options?: {
  host?: StudioAudioHost;
  onTransport?: (snapshot: StudioTransportSnapshot) => void;
  /** Fired once when the worklet graph cannot be armed. Playback continues without it. */
  onLiveStretchFailed?: () => void;
}): QviStudioPlaybackEngine {
  const host = options?.host ?? createStudioAudioHost();
  return new QviStudioPlaybackEngine(host, options?.onTransport, options?.onLiveStretchFailed);
}

/** Wrap one AudioContext so playback and the tempo preview share a clock. */
export function createStudioAudioHost(existing?: AudioContext): StudioAudioHost {
  const context = existing ?? createBrowserContext();
  return {
    get currentTime() {
      return context.currentTime;
    },
    get state() {
      return context.state;
    },
    destination: context.destination,
    resume: () => context.resume(),
    close: () => context.close(),
    createGain: () => context.createGain(),
    createAnalyser: () => {
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0;
      return analyser;
    },
    createStereoPanner: () => context.createStereoPanner(),
    createBiquadFilter: () => context.createBiquadFilter(),
    createDynamicsCompressor: () => context.createDynamicsCompressor(),
    createBufferSource: () => wrapBufferSource(context.createBufferSource()),
    createBuffer: (channels, length, sampleRate) => context.createBuffer(channels, length, sampleRate),
    decodeAudioData: (data) => context.decodeAudioData(data),
  };
}

function createBrowserContext(): AudioContext {
  const Context = globalThis.AudioContext;
  if (!Context) throw new Error("AudioContext is not available.");
  return new Context();
}

function wrapBufferSource(source: AudioBufferSourceNode): StudioBufferSource {
  return {
    get buffer() {
      return source.buffer;
    },
    set buffer(value: AudioBuffer | null) {
      source.buffer = value;
    },
    get onended() {
      return null;
    },
    set onended(handler: (() => void) | null) {
      source.onended = handler;
    },
    playbackRate: source.playbackRate,
    connect(destination) {
      source.connect(destination as AudioNode);
    },
    disconnect() {
      source.disconnect();
    },
    start(when, offset, duration) {
      source.start(when, offset, duration);
    },
    stop(when) {
      source.stop(when);
    },
  };
}

function gainFor(gains: { trackId: string; linear: number }[], trackId: string): number {
  return gains.find((gain) => gain.trackId === trackId)?.linear ?? 1;
}

function stretchParamKey(params: LiveStretchParams): string {
  const stretch = params.stretch;
  return [
    params.playbackRate,
    params.pitch,
    params.pitchSemitones,
    stretch.sequenceMs,
    stretch.seekWindowMs,
    stretch.overlapMs,
    stretch.quickSeek ? 1 : 0,
  ].join(":");
}

function fadeEnvelopeForClip(track: StudioTrack, clip: StudioClip, playhead: number, live: boolean) {
  const rate = Math.max(live ? resolveTempoRate(track.tempo) : 1, 1e-6);
  const sourceDuration = Math.max(0, clip.trimEndSec - clip.trimStartSec);
  const heardDuration = sourceDuration / rate;
  const heardStart = Math.max(0, clip.offsetSec);
  const intoHeard = Math.max(0, playhead - heardStart);
  const remaining = Math.max(0, heardDuration - intoHeard);
  return clipFadeRamps({
    heardDurationSec: heardDuration,
    fromHeardSec: intoHeard,
    sliceHeardSec: remaining,
    fadeInSec: clip.fadeInSec ?? 0,
    fadeOutSec: clip.fadeOutSec ?? 0,
  });
}

function clampTime(value: number, duration: number): number {
  const safe = Number.isFinite(value) ? value : 0;
  if (!Number.isFinite(duration)) return Math.max(0, safe);
  return Math.min(duration, Math.max(0, safe));
}
