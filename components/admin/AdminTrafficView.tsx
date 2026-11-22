"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import type { DashboardStats } from "@/lib/admin/overview";

type TrafficPayload = {
  visits: number;
  since: string;
  until: string;
  configured: boolean;
};

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function AdminTrafficView() {
  const { copy } = useI18n();
  const ad = copy.adminDashboard;

  const [days, setDays] = useState<7 | 30>(7);
  const [traffic, setTraffic] = useState<TrafficPayload | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const since = isoDaysAgo(days);
      const until = new Date().toISOString();
      const [trafficRes, overviewRes] = await Promise.all([
        fetch(`/api/admin/traffic?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`, {
          credentials: "include",
        }),
        fetch("/api/admin/overview", { credentials: "include" }),
      ]);
      if (!active) return;
      if (!trafficRes.ok) {
        const body = (await trafficRes.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? ad.loadError);
      } else {
        const body = (await trafficRes.json()) as { traffic?: TrafficPayload };
        setTraffic(body.traffic ?? null);
      }
      if (overviewRes.ok) {
        const body = (await overviewRes.json()) as { stats?: DashboardStats };
        setStats(body.stats ?? null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [days, ad.loadError]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{ad.trafficTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{ad.trafficLead}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={days === 7 ? "default" : "outline"} onClick={() => setDays(7)}>
            {ad.days7}
          </Button>
          <Button type="button" size="sm" variant={days === 30 ? "default" : "outline"} onClick={() => setDays(30)}>
            {ad.days30}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : (
        <>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs text-muted-foreground">{ad.cloudflareVisits}</p>
              {traffic?.configured ? (
                <p className="mt-2 text-3xl font-semibold tabular-nums">{traffic.visits}</p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{ad.trafficNotConfigured}</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs text-muted-foreground">{ad.internalNewUsers}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {days === 7 ? stats?.users.new_7d ?? "—" : stats?.users.new_30d ?? "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs text-muted-foreground">{ad.internalQv1Downloads}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{stats?.qv1_downloads.last_30d ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs text-muted-foreground">{ad.internalActiveDevices}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{stats?.active_devices ?? "—"}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}