"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useI18n } from "@/components/i18n/I18nProvider";
import {
  ADSENSE_FILL_TIMEOUT_MS,
  ADSENSE_UNAVAILABLE_EVENT,
  ADSENSE_UNIT_HEIGHT,
  ADSENSE_UNIT_WIDTH,
  adsenseScriptSrc,
  hasOnlyCollapsedFrames,
  isBrokenAdImage,
  judgeAdFill,
  resolveAdSensePlacement,
  type AdSlotPhase,
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
      onError={() => {
        window.dispatchEvent(new Event(ADSENSE_UNAVAILABLE_EVENT));
      }}
    />
  );
}

type ToolAdProps = {
  position: "top" | "bottom";
  className?: string;
};

function frameSignals(frame: HTMLIFrameElement) {
  const style = frame.getAttribute("style") ?? "";
  return {
    width: frame.offsetWidth || Number(frame.getAttribute("width")) || 0,
    height: frame.offsetHeight || Number(frame.getAttribute("height")) || 0,
    hidden: /display\s*:\s*none/i.test(style) || /visibility\s*:\s*hidden/i.test(style),
  };
}

/**
 * Fixed 300×250 Display unit. Pushes one manual request per slot.
 * React Strict Mode runs effects twice; a second push on the same ins is skipped.
 *
 * The shell stays in flow while the request is open so AdSense will actually
 * request it (a slot that starts at height 0 is often skipped). A page-colored
 * mask covers that box, so an unfilled or blocked creative never shows the
 * browser's light-gray broken-image frame. Unfilled, errored, empty, or timed-out
 * units collapse to nothing. A later `data-ad-status="filled"` still reveals the ad.
 */
export function ToolAd({ position, className }: ToolAdProps) {
  const { copy } = useI18n();
  const { client, topSlot, bottomSlot } = resolveAdSensePlacement();
  const slot = position === "top" ? topSlot : bottomSlot;
  const insRef = useRef<HTMLModElement>(null);
  const [phase, setPhase] = useState<AdSlotPhase>("pending");

  useEffect(() => {
    const ins = insRef.current;
    if (!ins || !client || !slot) return;

    const started = performance.now();
    let pushFailed = false;
    let disposed = false;

    const evaluate = () => {
      if (disposed) return;
      const root = ins.parentElement ?? ins;
      const images = Array.from(ins.querySelectorAll("img"));
      const verdict = judgeAdFill({
        adStatus: ins.getAttribute("data-ad-status"),
        scriptStatus: ins.getAttribute("data-adsbygoogle-status"),
        elapsedMs: performance.now() - started,
        pushFailed,
        brokenImage: images.some((img) =>
          isBrokenAdImage({
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            boxWidth: img.clientWidth || Number(img.getAttribute("width")) || 0,
            boxHeight: img.clientHeight || Number(img.getAttribute("height")) || 0,
          }),
        ),
        emptyFrame: hasOnlyCollapsedFrames(Array.from(root.querySelectorAll("iframe")).map(frameSignals)),
      });
      setPhase((current) => (current === verdict ? current : verdict));
    };

    const onUnavailable = () => {
      pushFailed = true;
      evaluate();
    };
    window.addEventListener(ADSENSE_UNAVAILABLE_EVENT, onUnavailable);

    if (ins.dataset.qviAdPushed !== "1" && !ins.getAttribute("data-adsbygoogle-status")) {
      ins.dataset.qviAdPushed = "1";
      try {
        const queue = (window.adsbygoogle = window.adsbygoogle || []);
        if (typeof queue.push !== "function") {
          pushFailed = true;
        } else {
          queue.push({});
        }
      } catch {
        ins.dataset.qviAdPushed = "";
      }
    }

    const observer = new MutationObserver(() => evaluate());
    observer.observe(ins, {
      attributes: true,
      attributeFilter: ["data-ad-status", "data-adsbygoogle-status", "style"],
      childList: true,
      subtree: true,
    });
    if (ins.parentElement) {
      observer.observe(ins.parentElement, { childList: true });
    }
    ins.addEventListener("error", evaluate, true);

    evaluate();
    const timer = window.setTimeout(evaluate, ADSENSE_FILL_TIMEOUT_MS);

    return () => {
      disposed = true;
      observer.disconnect();
      window.clearTimeout(timer);
      ins.removeEventListener("error", evaluate, true);
      window.removeEventListener(ADSENSE_UNAVAILABLE_EVENT, onUnavailable);
    };
  }, [client, slot]);

  if (!client || !slot) return null;

  const shown = phase === "filled";

  return (
    <aside
      data-ad-state={phase}
      className={cn(
        "qvi-ad-slot",
        phase !== "hidden" && className,
        phase === "hidden" && "hidden",
        phase === "pending" && "relative flex w-full items-center justify-center overflow-hidden bg-background",
        shown && "relative flex w-full items-center justify-center",
      )}
      style={
        phase === "hidden"
          ? { height: 0, minHeight: 0, margin: 0, padding: 0, overflow: "hidden" }
          : { minHeight: ADSENSE_UNIT_HEIGHT }
      }
      aria-hidden={shown ? undefined : true}
      aria-label={shown ? copy.layout.ads.label : undefined}
    >
      <ins
        ref={insRef}
        className="adsbygoogle relative z-0"
        style={{
          display: "inline-block",
          width: ADSENSE_UNIT_WIDTH,
          height: ADSENSE_UNIT_HEIGHT,
          background: "transparent",
        }}
        data-ad-client={client}
        data-ad-slot={slot}
      />
      {shown ? null : <div className="qvi-ad-mask absolute inset-0 z-10 bg-background" aria-hidden />}
    </aside>
  );
}
