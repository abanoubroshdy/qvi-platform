"use client";

import { Megaphone } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type AdPlaceholderProps = {
  position: "top" | "middle" | "bottom";
  className?: string;
};

export function AdPlaceholder({ position, className }: AdPlaceholderProps) {
  const { copy } = useI18n();
  const label = copy.layout.ads[position];

  return (
    <aside
      className={cn(
        "flex min-h-[90px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 px-4 text-center text-xs text-muted-foreground sm:min-h-[110px]",
        className,
      )}
      aria-label={label}
    >
      <span className="inline-flex items-center gap-2">
        <Megaphone className="h-4 w-4" aria-hidden />
        {label}
      </span>
    </aside>
  );
}
