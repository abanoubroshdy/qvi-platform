"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { batchConvertProgress } from "@/lib/audio-convert";
import { runSequentialBatch, type BatchSummary } from "@/lib/batch-runner";
import { downloadBlob } from "@/lib/download";
import {
  FFMPEG_MAX_INPUT_BYTES,
  FFmpegRunError,
  classifyFFmpegFailure,
  isFFmpegCancelled,
  terminateFFmpeg,
} from "@/lib/ffmpeg";
import { zipNamedBlobs } from "@/lib/media-output";

export type QueueErrorKind = "engine" | "no-audio" | "memory" | "generic";

export type QueueItem = {
  id: string;
  file: File;
  status: "ready" | "converting" | "done" | "error" | "cancelled";
  progress: number;
  errorKind?: QueueErrorKind;
  blob?: Blob;
  url?: string;
  downloadName?: string;
};

type ConvertResult = {
  blob: Blob;
  downloadName: string;
};

type ConvertContext = {
  onLoadProgress: (ratio: number) => void;
  onProgress: (ratio: number) => void;
};

function nextId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useConversionQueue(options: {
  acceptFile: (file: File) => boolean;
  convertFile: (file: File, index: number, ctx: ConvertContext) => Promise<ConvertResult>;
  zipName: () => string;
}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [items, setItems] = useState<QueueItem[]>([]);
  const [phase, setPhase] = useState<"idle" | "loading" | "converting">("idle");
  const [progress, setProgress] = useState(0);
  const [zipping, setZipping] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const cancelAllRef = useRef(false);
  const cancelIdsRef = useRef(new Set<string>());
  const runningRef = useRef(false);
  const zippingRef = useRef(false);

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        if (item.url) URL.revokeObjectURL(item.url);
      }
    };
  }, []);

  const revoke = useCallback((item: QueueItem) => {
    if (item.url) URL.revokeObjectURL(item.url);
  }, []);

  const busy = phase !== "idle" || zipping;

  const addFiles = useCallback(
    (files: File[]) => {
      if (runningRef.current || zippingRef.current) return { accepted: 0, rejected: files.length };
      const accepted: QueueItem[] = [];
      let rejected = 0;
      for (const file of files) {
        if (!optionsRef.current.acceptFile(file)) {
          rejected += 1;
          continue;
        }
        accepted.push({ id: nextId(), file, status: "ready", progress: 0 });
      }
      if (!accepted.length) return { accepted: 0, rejected };
      setItems((current) => {
        for (const item of current) revoke(item);
        return [
          ...current.map((item) => ({
            id: item.id,
            file: item.file,
            status: "ready" as const,
            progress: 0,
          })),
          ...accepted,
        ];
      });
      setPhase("idle");
      setProgress(0);
      return { accepted: accepted.length, rejected };
    },
    [revoke],
  );

  const removeItem = useCallback(
    (id: string) => {
      if (runningRef.current || zippingRef.current) return;
      setItems((current) => {
        const next: QueueItem[] = [];
        for (const item of current) {
          if (item.id === id) {
            revoke(item);
            continue;
          }
          next.push(item);
        }
        return next;
      });
    },
    [revoke],
  );

  const clearResults = useCallback(() => {
    if (runningRef.current || zippingRef.current) return;
    setItems((current) =>
      current.map((item) => {
        revoke(item);
        return { id: item.id, file: item.file, status: "ready" as const, progress: 0 };
      }),
    );
  }, [revoke]);

  const resetAll = useCallback(() => {
    if (runningRef.current || zippingRef.current) return;
    for (const item of itemsRef.current) revoke(item);
    setItems([]);
    setPhase("idle");
    setProgress(0);
  }, [revoke]);

  const convertAll = useCallback(async (): Promise<BatchSummary | null> => {
    if (runningRef.current || zippingRef.current || !itemsRef.current.length) return null;
    runningRef.current = true;
    cancelAllRef.current = false;
    cancelIdsRef.current = new Set();
    setPhase("loading");
    setProgress(0);

    const snapshot = itemsRef.current.map((item) => {
      revoke(item);
      return { id: item.id, file: item.file, status: "ready" as const, progress: 0 };
    });
    setItems(snapshot);

    const total = snapshot.length;
    let completed = 0;

    const apply = (id: string, next: QueueItem) => {
      setItems((current) => current.map((item) => (item.id === id ? next : item)));
    };

    try {
      return await runSequentialBatch<ConvertResult>({
        ids: snapshot.map((item) => item.id),
        isCancelled: (id) => cancelAllRef.current || cancelIdsRef.current.has(id),
        isStopped: () => cancelAllRef.current,
        convert: async (id, index, report) => {
          const file = snapshot[index].file;
          if (file.size >= FFMPEG_MAX_INPUT_BYTES) {
            throw new FFmpegRunError("File exceeds browser memory limit.");
          }
          return optionsRef.current.convertFile(file, index, {
            onLoadProgress: (ratio) => {
              setPhase("loading");
              setProgress(batchConvertProgress(completed, total, ratio * 0.15));
            },
            onProgress: (ratio) => {
              setPhase("converting");
              setProgress(batchConvertProgress(completed, total, 0.15 + ratio * 0.85));
              report(ratio);
            },
          });
        },
        onItem: (id, update) => {
          const current = snapshot.find((item) => item.id === id);
          if (!current) return;
          if (update.status === "done" && update.result) {
            completed += 1;
            const url = URL.createObjectURL(update.result.blob);
            apply(id, {
              id,
              file: current.file,
              status: "done",
              progress: 1,
              blob: update.result.blob,
              url,
              downloadName: update.result.downloadName,
            });
            setProgress(batchConvertProgress(completed, total, 0));
            return;
          }
          if (update.status === "error" || update.status === "cancelled") {
            completed += 1;
            const cancelled = update.status === "cancelled" || isFFmpegCancelled(update.error);
            apply(id, {
              id,
              file: current.file,
              status: cancelled ? "cancelled" : "error",
              progress: 0,
              errorKind: cancelled
                ? undefined
                : classifyFFmpegFailure(update.error, { fileBytes: current.file.size }),
            });
            setProgress(batchConvertProgress(completed, total, 0));
            return;
          }
          apply(id, {
            id,
            file: current.file,
            status: "converting",
            progress: update.progress ?? 0,
          });
        },
      });
    } finally {
      runningRef.current = false;
      setPhase("idle");
      setProgress(1);
    }
  }, [revoke]);

  const cancelItem = useCallback((id: string) => {
    if (!runningRef.current) return;
    cancelIdsRef.current.add(id);
    const current = itemsRef.current.find((item) => item.id === id);
    if (current?.status === "converting") void terminateFFmpeg();
  }, []);

  const cancelAll = useCallback(() => {
    if (!runningRef.current) return;
    cancelAllRef.current = true;
    for (const item of itemsRef.current) {
      if (item.status === "ready" || item.status === "converting") cancelIdsRef.current.add(item.id);
    }
    void terminateFFmpeg();
  }, []);

  const downloadAll = useCallback(async () => {
    const done = itemsRef.current.filter((item) => item.status === "done" && item.blob && item.downloadName);
    if (!done.length || runningRef.current || zippingRef.current) return "empty" as const;
    if (done.length === 1) {
      downloadBlob(done[0].blob!, done[0].downloadName!);
      return "ok" as const;
    }
    zippingRef.current = true;
    setZipping(true);
    try {
      const zip = await zipNamedBlobs(done.map((item) => ({ name: item.downloadName!, blob: item.blob! })));
      downloadBlob(zip, optionsRef.current.zipName());
      return "ok" as const;
    } catch (error) {
      console.error("[conversion-zip]", error);
      return "failed" as const;
    } finally {
      zippingRef.current = false;
      setZipping(false);
    }
  }, []);

  return {
    items,
    phase,
    progress,
    busy,
    addFiles,
    removeItem,
    clearResults,
    resetAll,
    convertAll,
    cancelItem,
    cancelAll,
    downloadAll,
  };
}
