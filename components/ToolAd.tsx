"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useI18n } from "@/components/i18n/I18nProvider";
import {
  ADSENSE_UNIT_HEIGHT,
  ADSENSE_UNIT_WIDTH,
  adsenseScriptSrc,
  resolveAdSensePlacement,
} from "@/lib/adsense";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

/** One loader for manual units. Next.js dedupes this id if a page renders it once. */
export function AdSenseScript() {
  const { client, topSlot, bottomSlot } = resolveAdSensePlacement();
  if (!client || (!topSlot && !bottomSlot)) return null;
  const src = adsenseScriptSrc(client);
  if (!src) return null;

  return (
    <Script
      id="adsbygoogle-init"
      async
      src={src}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}

type ToolAdProps = {
  position: "top" | "bottom";
  className?: string;
};

/**
 * Fixed 300×250 Display unit. Pushes one manual request per slot.
 * React Strict Mode runs effects twice; a second push on the same ins is skipped.
 * While the account is under review or the request is blocked, the box stays empty.
 */
export function ToolAd({ position, className }: ToolAdProps) {
  const { copy } = useI18n();
  const { client, topSlot, bottomSlot } = resolveAdSensePlacement();
  const slot = position === "top" ? topSlot : bottomSlot;
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    const ins = insRef.current;
    if (!ins || !client || !slot) return;
    if (ins.dataset.qviAdPushed === "1" || ins.getAttribute("data-adsbygoogle-status")) return;
    ins.dataset.qviAdPushed = "1";

    try {
      const queue = (window.adsbygoogle = window.adsbygoogle || []);
      queue.push({});
    } catch {
      ins.dataset.qviAdPushed = "";
    }
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <aside
      className={cn("flex items-center justify-center", className)}
      style={{ minHeight: ADSENSE_UNIT_HEIGHT }}
      aria-label={copy.layout.ads.label}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "inline-block", width: ADSENSE_UNIT_WIDTH, height: ADSENSE_UNIT_HEIGHT }}
        data-ad-client={client}
        data-ad-slot={slot}
      />
    </aside>
  );
}
