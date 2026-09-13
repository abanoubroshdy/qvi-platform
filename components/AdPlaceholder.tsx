import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

type AdPlaceholderProps = {
  position: "top" | "middle" | "bottom";
  className?: string;
};

const labels: Record<AdPlaceholderProps["position"], string> = {
  top: "Ad slot — top",
  middle: "Ad slot — middle",
  bottom: "Ad slot — bottom",
};

export function AdPlaceholder({ position, className }: AdPlaceholderProps) {
  return (
    <aside
      className={cn(
        "flex min-h-[90px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 px-4 text-center text-xs text-muted-foreground sm:min-h-[110px]",
        className,
      )}
      aria-label={labels[position]}
    >
      <span className="inline-flex items-center gap-2">
        <Megaphone className="h-4 w-4" aria-hidden />
        {labels[position]}
      </span>
    </aside>
  );
}
