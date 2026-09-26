"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ar } from "@/lib/i18n/ar";
import { en } from "@/lib/i18n/en";
import {
  QV1_DOWNLOAD_ENABLED,
  QV1_DOWNLOAD_PATH,
  claimQv1Autostart,
  isQv1AutostartConsumed,
  withoutQv1Autostart,
} from "@/lib/qv1-download";

const inFlight = new Set<string>();

function stripAutostartFromAddressBar() {
  const next = withoutQv1Autostart(window.location.href);
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, "", next);
}

export function Qv1AutostartNotice({ token }: { token: string | null }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [visible, setVisible] = useState(Boolean(token) && QV1_DOWNLOAD_ENABLED);

  useEffect(() => {
    if (!QV1_DOWNLOAD_ENABLED || !token) return;
    if (loading) return;

    if (!userId) {
      let storage: Storage | null = null;
      try {
        storage = window.sessionStorage;
      } catch {
        storage = null;
      }
      if (isQv1AutostartConsumed(token, storage)) {
        setVisible(false);
        stripAutostartFromAddressBar();
      }
      return;
    }

    let storage: Storage | null = null;
    try {
      storage = window.sessionStorage;
    } catch {
      storage = null;
    }
    const claim = claimQv1Autostart(token, storage, inFlight);
    stripAutostartFromAddressBar();
    if (claim === "done") setVisible(false);
    if (claim !== "start") return;
    window.location.assign(QV1_DOWNLOAD_PATH);
  }, [loading, token, userId]);

  if (!visible || !token) return null;

  return (
    <div
      id="qv1-download-started"
      className="mt-5 space-y-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm leading-6 text-foreground"
      role="status"
      aria-live="polite"
    >
      <p lang="en" dir="ltr">
        {en.qv1Page.downloadStarted}{" "}
        <a className="font-medium underline underline-offset-4 hover:text-foreground" href={QV1_DOWNLOAD_PATH}>
          {en.qv1Page.downloadFallback}
        </a>
      </p>
      <p lang="ar" dir="rtl">
        {ar.qv1Page.downloadStarted}{" "}
        <a className="font-medium underline underline-offset-4 hover:text-foreground" href={QV1_DOWNLOAD_PATH}>
          {ar.qv1Page.downloadFallback}
        </a>
      </p>
    </div>
  );
}
