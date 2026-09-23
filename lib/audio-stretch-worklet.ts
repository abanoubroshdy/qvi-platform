/**
 * Main-thread handle for the SoundTouch AudioWorklet.
 *
 * Registration and parameter updates run here. The processor's `process`
 * callback is the library's; this file does not add render-thread work.
 */

import { SoundTouchNode } from "@soundtouchjs/audio-worklet";
import type { LiveStretchParams } from "@/lib/audio-stretch-live";
import type { StudioLiveStretch } from "@/lib/studio/playback-engine";

export function liveStretchProcessorUrl(): string {
  return new URL("@soundtouchjs/audio-worklet/processor", import.meta.url).toString();
}

export async function enableLiveStretch(context: BaseAudioContext): Promise<boolean> {
  if (typeof context.audioWorklet?.addModule !== "function") return false;
  try {
    await SoundTouchNode.register(context, liveStretchProcessorUrl());
    return true;
  } catch {
    return false;
  }
}

export function createLiveStretchNode(context: AudioContext): StudioLiveStretch {
  const node = new SoundTouchNode({ context, outputChannelCount: 2 });
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

/** Writes AudioParams and queues WSOLA settings. Not called from the audio callback. */
export function applyLiveStretchNode(
  node: SoundTouchNode,
  sourceRate: AudioParam | null,
  params: LiveStretchParams,
): void {
  node.pitch.value = params.pitch;
  node.pitchSemitones.value = params.pitchSemitones;
  node.playbackRate.value = params.playbackRate;
  if (sourceRate) sourceRate.value = params.playbackRate;
  node.setStretchParameters(params.stretch);
}
