/**
 * Main-thread handle for the SoundTouch AudioWorklet.
 *
 * The processor module is imported only when a browser calls `enableLiveStretch`.
 * Importing it during server render crashes because `AudioWorkletNode` does not exist there.
 * Parameter updates run on the main thread. The library owns the audio callback.
 */

import type { LiveStretchParams } from "@/lib/audio-stretch-live";
import type { StudioLiveStretch } from "@/lib/studio/playback-engine";

type StretchNode = {
  pitch: { value: number };
  pitchSemitones: { value: number };
  playbackRate: { value: number };
  connect(destination: AudioNode): void;
  disconnect(): void;
  setStretchParameters(params: LiveStretchParams["stretch"]): void;
};

type SoundTouchModule = {
  SoundTouchNode: {
    register(context: BaseAudioContext, processorUrl: string | URL): Promise<void>;
    new (options: { context: AudioContext; outputChannelCount?: 1 | 2 }): StretchNode;
  };
};

let soundTouchModule: SoundTouchModule | null = null;

export function liveStretchProcessorUrl(): string {
  return new URL("@soundtouchjs/audio-worklet/processor", import.meta.url).toString();
}

export async function enableLiveStretch(context: BaseAudioContext): Promise<boolean> {
  if (typeof window === "undefined" || typeof context.audioWorklet?.addModule !== "function") return false;
  try {
    if (!soundTouchModule) {
      soundTouchModule = (await import("@soundtouchjs/audio-worklet")) as SoundTouchModule;
    }
    await soundTouchModule.SoundTouchNode.register(context, liveStretchProcessorUrl());
    return true;
  } catch {
    return false;
  }
}

export function createLiveStretchVoice(context: AudioContext): {
  input: AudioNode;
  connect(destination: AudioNode): void;
  disconnect(): void;
  apply(params: LiveStretchParams, sourceRate: AudioParam | null): void;
} {
  const node = createStretchNode(context);
  return {
    input: node,
    connect(destination) {
      node.connect(destination);
    },
    disconnect() {
      node.disconnect();
    },
    apply(params, sourceRate) {
      applyLiveStretchNode(node, sourceRate, params);
    },
  };
}

export function createLiveStretchNode(context: AudioContext): StudioLiveStretch {
  const node = createStretchNode(context);
  return {
    connect(destination) {
      node.connect(destination as AudioNode);
    },
    disconnect() {
      node.disconnect();
    },
    apply(params) {
      applyLiveStretchNode(node, null, params);
    },
  };
}

function createStretchNode(context: AudioContext): StretchNode & AudioNode {
  const loaded = soundTouchModule;
  if (!loaded) throw new Error("SoundTouch worklet is not registered");
  return new loaded.SoundTouchNode({ context, outputChannelCount: 2 }) as StretchNode & AudioNode;
}

/** Writes AudioParams and queues WSOLA settings. Not called from the audio callback. */
export function applyLiveStretchNode(
  node: StretchNode,
  sourceRate: AudioParam | null,
  params: LiveStretchParams,
): void {
  node.pitch.value = params.pitch;
  node.pitchSemitones.value = params.pitchSemitones;
  node.playbackRate.value = params.playbackRate;
  if (sourceRate) sourceRate.value = params.playbackRate;
  node.setStretchParameters(params.stretch);
}

export type { StretchNode as LiveStretchNode };
