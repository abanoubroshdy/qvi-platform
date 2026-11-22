"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { resolveTurnstileSiteKey } from "@/lib/turnstile";

type TurnstileWidgetProps = {
  onToken: (token: string) => void;
  onExpire?: () => void;
  action?: string;
  className?: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          action?: string;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export function turnstileEnabledOnClient(): boolean {
  const siteKey = resolveTurnstileSiteKey();
  return Boolean(siteKey);
}

export function TurnstileWidget({ onToken, onExpire, action, className }: TurnstileWidgetProps) {
  const siteKey = resolveTurnstileSiteKey();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || !window.turnstile) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "auto",
      action,
      callback: (token) => onToken(token),
      "expired-callback": () => {
        onToken("");
        onExpire?.();
      },
      "error-callback": () => {
        onToken("");
        onExpire?.();
      },
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, onExpire, onToken, scriptReady, siteKey]);

  if (!siteKey) return null;

  return (
    <div className={className}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="flex min-h-[65px] justify-center" dir="ltr" />
    </div>
  );
}