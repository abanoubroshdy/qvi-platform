/**
 * Microphone capture for a new clip.
 * The mic is not mixed into playback, so the take does not feed back through the speakers.
 */

import { concatChannelFrames } from "@/lib/studio/mix";

export type MicProcessEvent = {
  inputBuffer: {
    numberOfChannels: number;
    sampleRate: number;
    getChannelData(channel: number): Float32Array;
  };
};

export type MicProcessor = {
  onaudioprocess: ((event: MicProcessEvent) => void) | null;
  connect(destination: MicAudioNode): void;
  disconnect(): void;
};

export type MicAudioNode = {
  connect(destination: MicAudioNode): void;
  disconnect(): void;
};

export type MicGainNode = MicAudioNode & {
  gain: { value: number };
};

export type MicCaptureDeps = {
  sampleRate: number;
  destination: MicAudioNode;
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  createMediaStreamSource(stream: MediaStream): MicAudioNode;
  createScriptProcessor(bufferSize: number, inputChannels: number, outputChannels: number): MicProcessor;
  createGain(): MicGainNode;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer;
};

export class StudioMicCapture {
  private stream: MediaStream | null = null;
  private source: MicAudioNode | null = null;
  private processor: MicProcessor | null = null;
  private sink: MicGainNode | null = null;
  private readonly channelFrames: Float32Array[][] = [];
  private sampleRate: number;
  private capturing = false;

  constructor(private readonly deps: MicCaptureDeps) {
    this.sampleRate = deps.sampleRate > 0 ? deps.sampleRate : 44100;
  }

  async start(): Promise<void> {
    if (this.capturing) return;
    const stream = await this.deps.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, channelCount: 1 },
    });
    const source = this.deps.createMediaStreamSource(stream);
    const processor = this.deps.createScriptProcessor(4096, 1, 1);
    const sink = this.deps.createGain();
    sink.gain.value = 0;
    processor.onaudioprocess = (event) => this.storeFrame(event);
    source.connect(processor);
    processor.connect(sink);
    sink.connect(this.deps.destination);
    this.stream = stream;
    this.source = source;
    this.processor = processor;
    this.sink = sink;
    this.capturing = true;
  }

  stop(): AudioBuffer | null {
    const buffer = this.toBuffer();
    this.release();
    return buffer;
  }

  dispose(): void {
    this.channelFrames.length = 0;
    this.release();
  }

  private storeFrame(event: MicProcessEvent): void {
    const input = event.inputBuffer;
    const channels = Math.max(1, input.numberOfChannels || 1);
    if (input.sampleRate > 0) this.sampleRate = input.sampleRate;
    for (let channel = 0; channel < channels; channel += 1) {
      const data = input.getChannelData(channel);
      const copy = new Float32Array(data.length);
      copy.set(data);
      const bucket = this.channelFrames[channel] ?? [];
      bucket.push(copy);
      this.channelFrames[channel] = bucket;
    }
  }

  private toBuffer(): AudioBuffer | null {
    const channels = this.channelFrames.filter((frames) => frames.length > 0);
    if (!channels.length) return null;
    const length = concatChannelFrames(channels[0]!).length;
    if (length < 1) return null;
    const buffer = this.deps.createBuffer(channels.length, length, this.sampleRate);
    channels.forEach((frames, index) => {
      buffer.getChannelData(index).set(concatChannelFrames(frames));
    });
    return buffer;
  }

  private release(): void {
    this.capturing = false;
    if (this.processor) this.processor.onaudioprocess = null;
    disconnect(this.processor);
    disconnect(this.source);
    disconnect(this.sink);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.processor = null;
    this.source = null;
    this.sink = null;
    this.stream = null;
  }
}

function disconnect(node: { disconnect(): void } | null): void {
  if (!node) return;
  try {
    node.disconnect();
  } catch {
    /* already disconnected */
  }
}
