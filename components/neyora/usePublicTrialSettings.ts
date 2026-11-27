"use client";

import { useEffect, useState } from "react";

export type PublicTrialSettings = {
  enabled: boolean;
  duration_days: number;
};

export function usePublicTrialSettings(product = "NEYORA_PRO") {
  const [settings, setSettings] = useState<PublicTrialSettings>({ enabled: false, duration_days: 14 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/trial-settings?product=${encodeURIComponent(product)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const body = (await response.json()) as { enabled?: boolean; duration_days?: number };
        if (!active) return;
        setSettings({
          enabled: body.enabled === true,
          duration_days: typeof body.duration_days === "number" ? body.duration_days : 14,
        });
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [product]);

  return { settings, loading };
}