"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/I18nProvider";
import { copyText } from "@/lib/clipboard";

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const { copy } = useI18n();
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (!value) return;
    try {
      await copyText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={() => void onCopy()} disabled={!value}>
      {copied ? <Check /> : <Copy />}
      {copied ? copy.common.copied : label ?? copy.common.copy}
    </Button>
  );
}
