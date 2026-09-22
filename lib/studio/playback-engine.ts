/**
 * Live QVI Studio playback (phase 2).
 *
 * Web Audio schedules the plan from `playback-schedule`. Tempo and pitch are
 * not applied here; a rendered track buffer is, once the preview has one.
 */

import type { StudioEngineStatus, StudioPlaybackEngine } from "@/lib/studio/engine";
import { loadStudioFile, type StudioDecodeResult } from "@/lib/studio/load-clip";
import { planPlayback } from "@/lib/studio/playback-schedule";
import { canPlayStudioProject, projectDuration } from "@/lib/studio/project";
import type { StudioProject } from "@/lib/studio/types";

export interface StudioAudioNode {
  connect(destination: StudioAudioNode): void;
  disconnect(): void;
}

export interface StudioGainNode extends StudioAudioNode {
  gain: { value: number };
}

export interface StudioBufferSource extends StudioAudioNode {
  buffer: AudioBuffer | null;
  onended: (() => void) | null;
  start(when?: number, offset?: number, duration?: number): void;
  stop(when?: number): void;
}

export interface StudioAudioHost {
  currentTime: number;
  state: AudioContextState;
  destination: StudioAudioNode;
  resume(): Promise<void>;
  close(): Promise<void>;
  createGain(): StudioGainNode;
  createBufferSource(): StudioBufferSource;
  createBuffer?(channels: number, length: number, sampleRate: number): AudioBuffer;
  decodeAudioData?(data: ArrayBuffer): Promise<AudioBuffer>;
}

export type StudioTransportSnapshot = {
  status: StudioEngineStatus;
  playheadSec: number;
};

export class QviStudioPlaybackEngine implements StudioPlaybackEngine {
  private readonly host: StudioAudioHost;
  private readonly onTransport?: (snapshot: StudioTransportSnapshot) => void;
  private readonly master: StudioGainNode;
  private readonly trackGains = new Map<string, StudioGainNode>();
  private readonly rendered = new Map<string, AudioBuffer>();
  private sources: StudioBufferSource[] = [];
  private activeProject: StudioProject | null = null;
  private status: StudioEngineStatus = "idle";
  private playheadSec = 0;
  private anchorContextTime = 0;
  private anchorPlayhead = 0;
  private disposed = false;

  constructor(host: StudioAudioHost, onTransport?: (snapshot: StudioTransportSnapshot) => void) {
    this.host = host;
    this.onTransport = onTransport;
    this.master = host.createGain();
    this.master.gain.value = 1;
    this.master.connect(host.destination);
  }

  currentStatus(): StudioEngineStatus {
    return this.status;
  }

  currentPlayhead(): number {
    if (this.status !== "playing") return this.playheadSec;
    const elapsed = this.host.currentTime - this.anchorContextTime;
    const duration = this.activeProject ? projectDuration(this.activeProject) : 0;
    return Math.min(duration, Math.max(0, this.anchorPlayhead + elapsed));
  }

  poll(): StudioTransportSnapshot {
    if (this.status === "playing" && this.activeProject) {
      const duration = projectDuration(this.activeProject);
      const playhead = this.currentPlayhead();
      if (playhead >= duration) {
        this.stopSources();
        this.status = "paused";
        this.playheadSec = duration;
        this.emit();
      } else {
        this.playheadSec = playhead;
      }
    }
    return { status: this.status, playheadSec: this.playheadSec };
  }

  setRenderedTrack(trackId: string, buffer: AudioBuffer | null): void {
    if (this.disposed) return;
    if (buffer) this.rendered.set(trackId, buffer);
    else this.rendered.delete(trackId);
    if (this.status === "playing" && this.activeProject) {
      this.arm(this.activeProject, this.currentPlayhead());
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
    this.arm(project, playhead);
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
    if (this.status === "playing" && this.activeProject) this.arm(this.activeProject, this.playheadSec);
    this.emit();
  }

  sync(project: StudioProject): void {
    if (this.disposed) return;
    this.activeProject = project;
    if (this.status === "playing") {
      this.arm(project, this.currentPlayhead());
    } else {
      this.playheadSec = clampTime(project.playheadSec, projectDuration(project));
      this.applyGains(project);
    }
    this.emit();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopSources();
    this.status = "idle";
    this.trackGains.forEach((node) => {
      try {
        node.disconnect();
      } catch {
        /* already disconnected */
      }
    });
    this.trackGains.clear();
    try {
      this.master.disconnect();
    } catch {
      /* already disconnected */
    }
    void this.host.close().catch(() => undefined);
  }

  private arm(project: StudioProject, playhead: number): void {
    this.stopSources();
    this.anchorContextTime = this.host.currentTime;
    this.anchorPlayhead = playhead;
    this.playheadSec = playhead;
    const plan = planPlayback({ project, playheadSec: playhead, renderedTracks: this.rendered });
    this.master.gain.value = plan.masterGain;
    const whenBase = this.host.currentTime;
    const playingTracks = new Set<string>();
    for (const event of plan.events) {
      const source = this.host.createBufferSource();
      source.buffer = event.buffer;
      source.connect(this.trackGain(event.trackId, gainFor(plan.trackGains, event.trackId)));
      source.start(whenBase + event.delaySec, event.offsetSec, event.durationSec);
      this.sources.push(source);
      playingTracks.add(event.trackId);
    }
    for (const gain of plan.trackGains) {
      if (playingTracks.has(gain.trackId)) continue;
      const node = this.trackGains.get(gain.trackId);
      if (node) node.gain.value = gain.linear;
    }
  }

  private applyGains(project: StudioProject): void {
    const plan = planPlayback({ project, playheadSec: this.playheadSec, renderedTracks: this.rendered });
    this.master.gain.value = plan.masterGain;
    for (const gain of plan.trackGains) {
      const node = this.trackGains.get(gain.trackId);
      if (node) node.gain.value = gain.linear;
    }
  }

  private trackGain(trackId: string, linear: number): StudioGainNode {
    let node = this.trackGains.get(trackId);
    if (!node) {
      node = this.host.createGain();
      node.connect(this.master);
      this.trackGains.set(trackId, node);
    }
    node.gain.value = linear;
    return node;
  }

  private stopSources(): void {
    const previous = this.sources;
    this.sources = [];
    for (const source of previous) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      try {
        source.disconnect();
      } catch {
        /* already disconnected */
      }
    }
  }

  private emit(): void {
    this.onTransport?.({ status: this.status, playheadSec: this.currentPlayhead() });
  }
}

export function createStudioPlaybackEngine(options?: {
  host?: StudioAudioHost;
  onTransport?: (snapshot: StudioTransportSnapshot) => void;
}): QviStudioPlaybackEngine {
  const host = options?.host ?? createStudioAudioHost();
  return new QviStudioPlaybackEngine(host, options?.onTransport);
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

function clampTime(value: number, duration: number): number {
  const safe = Number.isFinite(value) ? value : 0;
  if (!Number.isFinite(duration)) return Math.max(0, safe);
  return Math.min(duration, Math.max(0, safe));
}
