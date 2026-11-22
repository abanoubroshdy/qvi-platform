"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { formatAdminDateTime } from "@/lib/admin/format";
import { licenseStatusLabel } from "@/lib/admin/license-status-label";
import type { DashboardStats } from "@/lib/admin/overview";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function AdminOverviewView() {
  const { copy, locale } = useI18n();
  const ad = copy.adminDashboard;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const response = await fetch("/api/admin/overview", { credentials: "include" });
      if (!active) return;
      if (!response.ok) {
        setError(ad.loadError);
        setLoading(false);
        return;
      }
      const body = (await response.json()) as { stats?: DashboardStats };
      setStats(body.stats ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [ad.loadError]);

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (error || !stats) {
    return <p className="text-sm text-destructive">{error ?? ad.loadError}</p>;
  }

  const localeTag = locale === "ar" ? "ar" : "en";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{ad.overviewTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ad.overviewLead}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={ad.stats.totalUsers} value={stats.users.total} />
        <StatCard label={ad.stats.newUsers7d} value={stats.users.new_7d} />
        <StatCard label={ad.stats.newUsers30d} value={stats.users.new_30d} />
        <StatCard label={ad.stats.activeDevices} value={stats.active_devices} />
        <StatCard label={ad.stats.qv1DownloadsTotal} value={stats.qv1_downloads.total} />
        <StatCard label={ad.stats.qv1Downloads30d} value={stats.qv1_downloads.last_30d} />
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">{ad.licensesByProduct}</h2>
        {stats.licenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ad.noData}</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {stats.licenses.map((row, index) => (
              <li key={`${row.product_code}-${row.status}-${index}`} className="flex justify-between gap-3 py-2">
                <span>
                  {row.product_name} ·{" "}
                  <span className="text-muted-foreground">{licenseStatusLabel(row.status, copy)}</span>
                </span>
                <span className="font-medium tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">{ad.recentSignups}</h2>
        {stats.recent_signups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ad.noData}</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {stats.recent_signups.map((row, index) => (
              <li key={`${row.created_at}-${index}`} className="flex justify-between gap-3 py-2">
                <span>{row.email ?? ad.emDash}</span>
                <span className="text-muted-foreground">{formatAdminDateTime(row.created_at, localeTag)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}