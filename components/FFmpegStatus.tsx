"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { formatPercent } from "@/lib/format";

export function FFmpegStatus({
  phase,
  progress,
}: {
  phase: "idle" | "loading" | "converting";
  progress: number;
}) {
  const { copy } = useI18n();
  if (phase === "idle") return null;

  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const label = phase === "loading" ? copy.ffmpeg.loadingEngine : copy.ffmpeg.converting;
  const hint = phase === "loading" ? copy.ffmpeg.loadingHint : copy.ffmpeg.convertingHint;

  return (
    <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold">
        <p className="text-start">{label}</p>
        <span className="tabular-nums text-primary" dir="ltr">
          {formatPercent(percent)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-primary/15" dir="ltr">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-start text-xs leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}
