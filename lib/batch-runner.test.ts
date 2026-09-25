import { describe, expect, it } from "vitest";
import { runSequentialBatch } from "@/lib/batch-runner";
import { selectFFmpegCore } from "@/lib/ffmpeg";
import { isVideoFile } from "@/lib/video-input";
import { uniqueOutputName, zipNamedBlobs } from "@/lib/media-output";

describe("selectFFmpegCore", () => {
  it("uses the multithread core only when the page is cross-origin isolated", () => {
    expect(selectFFmpegCore(true)).toBe("mt");
    expect(selectFFmpegCore(false)).toBe("st");
  });
});

describe("isVideoFile", () => {
  it("accepts common containers by extension or video mime", () => {
    expect(isVideoFile(new File([], "clip.MP4"))).toBe(true);
    expect(isVideoFile(new File([], "clip.mkv"))).toBe(true);
    expect(isVideoFile(new File([], "clip.webm"))).toBe(true);
    expect(isVideoFile(new File([], "show.m2ts"))).toBe(true);
    expect(isVideoFile(new File([], "phone.3gp"))).toBe(true);
    expect(isVideoFile(new File([], "tape.ogv"))).toBe(true);
    expect(isVideoFile(new File([], "notes.txt"))).toBe(false);
    expect(isVideoFile(new File([], "song.mp3", { type: "audio/mpeg" }))).toBe(false);
    expect(isVideoFile(new File([], "capture", { type: "video/quicktime" }))).toBe(true);
  });
});

describe("runSequentialBatch", () => {
  it("continues after a failure and skips cancelled ids", async () => {
    const events: string[] = [];
    const summary = await runSequentialBatch<string>({
      ids: ["a", "b", "c"],
      isCancelled: (id) => id === "c",
      isStopped: () => false,
      convert: async (id) => {
        if (id === "b") throw new Error("boom");
        return id.toUpperCase();
      },
      onItem: (id, update) => {
        if (update.status !== "converting" || update.progress === 0) events.push(`${id}:${update.status}`);
      },
    });

    expect(summary).toEqual({ total: 3, done: 1, failed: 1, cancelled: 1 });
    expect(events).toEqual(["a:converting", "a:done", "b:converting", "b:error", "c:cancelled"]);
  });

  it("stops the rest of the queue when the batch is cancelled", async () => {
    let stop = false;
    const summary = await runSequentialBatch<number>({
      ids: ["1", "2", "3"],
      isCancelled: () => stop,
      isStopped: () => stop,
      convert: async () => {
        stop = true;
        return 1;
      },
      onItem: () => undefined,
    });
    expect(summary.done).toBe(0);
    expect(summary.cancelled).toBe(3);
    expect(summary.failed).toBe(0);
  });
});

describe("media output names", () => {
  it("dedupes stems and zips entries", async () => {
    const used = new Set<string>();
    expect(uniqueOutputName("a.mp4", "mp3", used, "audio")).toBe("a.mp3");
    expect(uniqueOutputName("a.mov", "mp3", used, "audio")).toBe("a-2.mp3");
    const zipBlob = await zipNamedBlobs([
      { name: "a.mp3", blob: new Blob(["one"]) },
      { name: "a.mp3", blob: new Blob(["two"]) },
    ]);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(zipBlob);
    expect(Object.keys(zip.files).sort()).toEqual(["a-2.mp3", "a.mp3"]);
  });
});
