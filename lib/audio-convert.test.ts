import { describe, expect, it } from "vitest";
import {
  audioFileStem,
  batchConvertProgress,
  convertedOutputName,
  isConvertibleAudioFile,
  uniqueConvertedName,
  zipAudioBlobs,
} from "@/lib/audio-convert";

describe("audio-convert helpers", () => {
  it("detects common audio filenames and mime types", () => {
    expect(isConvertibleAudioFile(new File([], "a.mp3", { type: "audio/mpeg" }))).toBe(true);
    expect(isConvertibleAudioFile(new File([], "a.flac"))).toBe(true);
    expect(isConvertibleAudioFile(new File([], "a.opus"))).toBe(true);
    expect(isConvertibleAudioFile(new File([], "a.txt"))).toBe(false);
    expect(isConvertibleAudioFile(new File([], "clip", { type: "audio/wav" }))).toBe(true);
  });

  it("builds output names from stems", () => {
    expect(audioFileStem("song.mp3")).toBe("song");
    expect(convertedOutputName("song.mp3", "wav")).toBe("song.wav");
    expect(convertedOutputName(".hidden", "flac")).toBe("audio.flac");
  });

  it("dedupes colliding output names", () => {
    const used = new Set<string>();
    expect(uniqueConvertedName("a.mp3", "wav", used)).toBe("a.wav");
    expect(uniqueConvertedName("a.m4a", "wav", used)).toBe("a-2.wav");
    expect(uniqueConvertedName("a.ogg", "wav", used)).toBe("a-3.wav");
  });

  it("maps batch progress across files", () => {
    expect(batchConvertProgress(0, 2, 0)).toBe(0);
    expect(batchConvertProgress(0, 2, 0.5)).toBe(0.25);
    expect(batchConvertProgress(1, 2, 0)).toBe(0.5);
    expect(batchConvertProgress(1, 2, 1)).toBe(1);
    expect(batchConvertProgress(0, 0, 1)).toBe(0);
  });

  it("zips blobs with unique entry names", async () => {
    const zipBlob = await zipAudioBlobs([
      { name: "a.wav", blob: new Blob(["one"], { type: "audio/wav" }) },
      { name: "a.wav", blob: new Blob(["two"], { type: "audio/wav" }) },
    ]);
    expect(zipBlob.size).toBeGreaterThan(20);

    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(zipBlob);
    expect(Object.keys(zip.files).sort()).toEqual(["a-2.wav", "a.wav"]);
    expect(await zip.file("a.wav")!.async("string")).toBe("one");
    expect(await zip.file("a-2.wav")!.async("string")).toBe("two");
  });
});
