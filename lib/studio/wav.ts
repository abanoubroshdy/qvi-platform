/** 16-bit PCM WAV for the tempo/pitch preview. FFmpeg reads this; it is not an export format. */

export function encodeWavPcm16(buffer: AudioBuffer): Uint8Array {
  const channels = Math.max(1, buffer.numberOfChannels || 1);
  const sampleRate = Math.max(1, Math.round(buffer.sampleRate || 44100));
  const first = buffer.getChannelData(0);
  const frames = buffer.length || first.length;
  const dataSize = frames * channels * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  writeString(bytes, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(bytes, 8, "WAVE");
  writeString(bytes, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeString(bytes, 36, "data");
  view.setUint32(40, dataSize, true);

  const channelData = Array.from({ length: channels }, (_, index) =>
    buffer.getChannelData(Math.min(index, Math.max(0, buffer.numberOfChannels - 1))),
  );
  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel]?.[frame] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return bytes;
}

/** A standalone ArrayBuffer, safe to pass into Blob and File. */
export function wavArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function writeString(bytes: Uint8Array, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) bytes[offset + index] = value.charCodeAt(index);
}
