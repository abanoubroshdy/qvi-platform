"use client";

import Script from "next/script";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { resolveTurnstileSiteKey } from "@/lib/turnstile";

type TurnstileWidgetProps = {
  onToken: (token: string) => void;
  onExpire?: () => void;
  action?: string;
  className?: string;
  /** When true, log if the site key is missing from the client bundle (misconfiguration). */
  serverEnforcesTurnstile?: boolean;
};

export type TurnstileWidgetHandle = {
  reset: () => void;
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

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(function TurnstileWidget(
  { onToken, onExpire, action, className, serverEnforcesTurnstile = false },
  ref,
) {
  const siteKey = resolveTurnstileSiteKey();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  const [scriptReady, setScriptReady] = useState(false);

  onTokenRef.current = onToken;
  onExpireRef.current = onExpire;

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        const widgetId = widgetIdRef.current;
        if (widgetId && window.turnstile) {
          window.turnstile.reset(widgetId);
        }
        onTokenRef.current("");
      },
    }),
    [],
  );

  useEffect(() => {
    if (serverEnforcesTurnstile && !siteKey) {
      console.error(
        "[QVI Turnstile] Server enforces Turnstile but NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing in the client bundle. Complete the security check cannot work until the site key is set at build time.",
      );
    }
  }, [serverEnforcesTurnstile, siteKey]);

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || !window.turnstile) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "auto",
      action,
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => {
        onTokenRef.current("");
        onExpireRef.current?.();
      },
      "error-callback": () => {
        onTokenRef.current("");
        onExpireRef.current?.();
      },
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, scriptReady, siteKey]);

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
});