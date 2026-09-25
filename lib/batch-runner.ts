export type BatchItemStatus = "ready" | "converting" | "done" | "error" | "cancelled";

export type BatchItemUpdate<T> = {
  status: BatchItemStatus;
  progress?: number;
  result?: T;
  error?: unknown;
};

export type BatchSummary = {
  total: number;
  done: number;
  failed: number;
  cancelled: number;
};

/**
 * Convert items one at a time. A thrown error on one id is reported and the
 * loop continues. Cancellation is checked before each item and after each success.
 */
export async function runSequentialBatch<T>(params: {
  ids: string[];
  isCancelled: (id: string) => boolean;
  isStopped: () => boolean;
  convert: (id: string, index: number, report: (ratio: number) => void) => Promise<T>;
  onItem: (id: string, update: BatchItemUpdate<T>) => void;
}): Promise<BatchSummary> {
  let done = 0;
  let failed = 0;
  let cancelled = 0;

  for (let index = 0; index < params.ids.length; index += 1) {
    const id = params.ids[index];
    if (params.isStopped() || params.isCancelled(id)) {
      params.onItem(id, { status: "cancelled", progress: 0 });
      cancelled += 1;
      continue;
    }

    params.onItem(id, { status: "converting", progress: 0 });
    try {
      const result = await params.convert(id, index, (ratio) => {
        const progress = Math.min(1, Math.max(0, ratio));
        params.onItem(id, { status: "converting", progress });
      });
      if (params.isStopped() || params.isCancelled(id)) {
        params.onItem(id, { status: "cancelled", progress: 0 });
        cancelled += 1;
        continue;
      }
      params.onItem(id, { status: "done", progress: 1, result });
      done += 1;
    } catch (error) {
      if (params.isStopped() || params.isCancelled(id)) {
        params.onItem(id, { status: "cancelled", progress: 0 });
        cancelled += 1;
        continue;
      }
      params.onItem(id, { status: "error", progress: 0, error });
      failed += 1;
    }
  }

  return { total: params.ids.length, done, failed, cancelled };
}
