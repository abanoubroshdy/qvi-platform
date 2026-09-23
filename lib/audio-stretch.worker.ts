import { stretchChannels, type StretchChannelRequest } from "./audio-stretch";

type StretchWorkerRequest = StretchChannelRequest & {
  id: number;
};

type WorkerScope = {
  onmessage: ((event: MessageEvent<StretchWorkerRequest>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const request = event.data;
  try {
    const result = stretchChannels({
      channels: request.channels,
      sampleRate: request.sampleRate,
      tempoRate: request.tempoRate,
      semitones: request.semitones,
      cents: request.cents,
      preset: request.preset,
      onProgress: (ratio) => scope.postMessage({ id: request.id, progress: ratio }),
    });
    const transfer = result.channels.map((channel) => channel.buffer);
    scope.postMessage({ id: request.id, ...result }, transfer);
  } catch (error) {
    scope.postMessage({
      id: request.id,
      error: error instanceof Error ? error.message : "Stretch failed",
    });
  }
};
