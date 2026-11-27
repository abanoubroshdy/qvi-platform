"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type TrialBadgeProps = {
  className?: string;
};

export function TrialBadge({ className }: TrialBadgeProps) {
  const { copy } = useI18n();
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-amber-500/40 bg-[#FEF3C7] text-amber-800 dark:border-[#FBBF24]/40 dark:bg-[#2A2420]/80 dark:text-[#FBBF24]",
        className,
      )}
    >
      {copy.auth.trialBadge}
    </Badge>
  );
}