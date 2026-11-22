"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import type { DashboardStats } from "@/lib/admin/overview";
import type { TrafficSummary } from "@/lib/admin/cloudflare-analytics";
import { TRAFFIC_MAX_RANGE_DAYS } from "@/lib/admin/cloudflare-analytics";

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function AdminTrafficView() {
  const { copy, t, locale } = useI18n();
  const ad = copy.adminDashboard;

  const [days, setDays] = useState<7 | 30>(7);
  const [traffic, setTraffic] = useState<TrafficSummary | null>(null);
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
        setTraffic(null);
      } else {
        const body = (await trafficRes.json()) as { traffic?: TrafficSummary };
        const payload = body.traffic ?? null;
        setTraffic(payload);
        if (payload?.graphqlErrors?.length) {
          setError(t(ad.trafficGraphqlError, { message: payload.graphqlErrors.join(" ") }));
        }
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
  }, [days, ad.loadError, ad.trafficGraphqlError, t]);

  const tableDir = locale === "ar" ? "rtl" : "ltr";

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
          {traffic?.rangeClamped ? (
            <p className="text-sm text-muted-foreground">
              {t(ad.trafficRangeClamped, { days: TRAFFIC_MAX_RANGE_DAYS })}
            </p>
          ) : null}
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
              <p className="text-xs text-muted-foreground">{ad.trafficPageViews}</p>
              {traffic?.configured ? (
                <p className="mt-2 text-3xl font-semibold tabular-nums">{traffic.pageViews}</p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{ad.trafficNotConfigured}</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs text-muted-foreground">{ad.internalNewUsers}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {days === 7 ? stats?.users.new_7d ?? ad.emDash : stats?.users.new_30d ?? ad.emDash}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs text-muted-foreground">{ad.internalQv1Downloads}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{stats?.qv1_downloads.last_30d ?? ad.emDash}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 sm:col-span-2">
              <p className="text-xs text-muted-foreground">{ad.internalActiveDevices}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{stats?.active_devices ?? ad.emDash}</p>
            </div>
          </div>

          {traffic?.configured ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="overflow-x-auto rounded-2xl border border-border bg-card" dir={tableDir}>
                <h2 className="border-b border-border p-4 text-sm font-semibold">{ad.topPages}</h2>
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="p-3 text-start font-medium">{ad.columnPath}</th>
                      <th className="p-3 text-end font-medium">{ad.columnPageViews}</th>
                      <th className="p-3 text-end font-medium">{ad.columnVisits}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traffic.topPages.map((row) => (
                      <tr key={row.label} className="border-t border-border/60">
                        <td className="max-w-[14rem] truncate p-3 font-mono text-xs" title={row.label} dir="ltr">
                          {row.label}
                        </td>
                        <td className="p-3 text-end tabular-nums">{row.pageViews}</td>
                        <td className="p-3 text-end tabular-nums">{row.visits}</td>
                      </tr>
                    ))}
                    {traffic.topPages.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-muted-foreground">
                          {ad.noData}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </section>
              <section className="overflow-x-auto rounded-2xl border border-border bg-card" dir={tableDir}>
                <h2 className="border-b border-border p-4 text-sm font-semibold">{ad.topCountries}</h2>
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="p-3 text-start font-medium">{ad.columnCountry}</th>
                      <th className="p-3 text-end font-medium">{ad.columnPageViews}</th>
                      <th className="p-3 text-end font-medium">{ad.columnVisits}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traffic.topCountries.map((row) => (
                      <tr key={row.label} className="border-t border-border/60">
                        <td className="p-3">{row.label}</td>
                        <td className="p-3 text-end tabular-nums">{row.pageViews}</td>
                        <td className="p-3 text-end tabular-nums">{row.visits}</td>
                      </tr>
                    ))}
                    {traffic.topCountries.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-muted-foreground">
                          {ad.noData}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </section>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}