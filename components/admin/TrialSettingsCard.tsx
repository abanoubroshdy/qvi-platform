"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TrialSettings = {
  enabled: boolean;
  duration_days: number;
  max_devices: number;
};

export function TrialSettingsCard() {
  const { copy } = useI18n();
  const ts = copy.licenseAdmin.trialSettings;

  const [settings, setSettings] = useState<TrialSettings>({
    enabled: true,
    duration_days: 14,
    max_devices: 1,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/trial-settings?product=NEYORA_PRO", { credentials: "include" });
    if (!response.ok) return;
    const body = (await response.json()) as { settings?: TrialSettings };
    if (body.settings) setSettings(body.settings);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setMessage(null);
    setError(false);
    try {
      const response = await fetch("/api/admin/trial-settings?product=NEYORA_PRO", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const body = (await response.json()) as { error?: string; settings?: TrialSettings };
      if (!response.ok) {
        setError(true);
        setMessage(body.error ?? ts.error);
        return;
      }
      if (body.settings) setSettings(body.settings);
      setMessage(ts.saved);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">{ts.title}</h2>
      <p className="text-sm text-muted-foreground">{ts.lead}</p>

      {message ? (
        <p className={error ? "text-sm text-destructive" : "text-sm text-primary"} role="status">
          {message}
        </p>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={settings.enabled}
          onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
        />
        {ts.enabledLabel}
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={settings.duration_days === 14 ? "default" : "outline"}
          onClick={() => setSettings((s) => ({ ...s, duration_days: 14 }))}
        >
          {ts.preset14}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={settings.duration_days === 30 ? "default" : "outline"}
          onClick={() => setSettings((s) => ({ ...s, duration_days: 30 }))}
        >
          {ts.preset30}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="trial-duration">{ts.durationLabel}</Label>
          <Input
            id="trial-duration"
            type="number"
            min={1}
            max={365}
            className="tabular-nums"
            value={settings.duration_days}
            onChange={(e) =>
              setSettings((s) => ({ ...s, duration_days: Number.parseInt(e.target.value, 10) || 14 }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trial-max-devices">{ts.maxDevicesLabel}</Label>
          <Input
            id="trial-max-devices"
            type="number"
            min={1}
            max={10}
            className="tabular-nums"
            value={settings.max_devices}
            onChange={(e) =>
              setSettings((s) => ({ ...s, max_devices: Number.parseInt(e.target.value, 10) || 1 }))
            }
          />
        </div>
      </div>

      <Button type="button" disabled={busy} onClick={() => void save()}>
        {busy ? ts.working : ts.saveCta}
      </Button>
    </div>
  );
}