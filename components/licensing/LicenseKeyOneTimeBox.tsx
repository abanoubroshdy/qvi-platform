"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LicenseKeyOneTimeBox({
  licenseKey,
  title,
  warning,
  copyLabel,
  copiedLabel,
  dismissLabel,
  onDismiss,
}: {
  licenseKey: string;
  title: string;
  warning: string;
  copyLabel: string;
  copiedLabel: string;
  dismissLabel?: string;
  onDismiss?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="space-y-3 rounded-xl border-2 border-primary/50 bg-primary/10 p-4"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{warning}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center" dir="ltr">
        <code className="flex-1 break-all rounded-md bg-background px-3 py-2 font-mono text-base font-semibold tracking-wide text-foreground">
          {licenseKey}
        </code>
        <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={() => void copyKey()}>
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              {copiedLabel}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              {copyLabel}
            </>
          )}
        </Button>
      </div>
      {onDismiss && dismissLabel ? (
        <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" onClick={onDismiss}>
          {dismissLabel}
        </Button>
      ) : null}
    </div>
  );
}