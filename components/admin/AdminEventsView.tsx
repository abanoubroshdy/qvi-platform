"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LicenseEvent = {
  id: string;
  event_type: string;
  success: boolean;
  error_code: string | null;
  license_id: string | null;
  created_at: string;
};

export function AdminEventsView() {
  const { copy } = useI18n();
  const ad = copy.adminDashboard;

  const [events, setEvents] = useState<LicenseEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({
    eventType: "",
    success: "all" as "all" | "true" | "false",
    since: "",
    until: "",
  });
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (filters.eventType.trim()) params.set("event_type", filters.eventType.trim());
    if (filters.success !== "all") params.set("success", filters.success);
    if (filters.since) params.set("since", new Date(filters.since).toISOString());
    if (filters.until) params.set("until", new Date(filters.until).toISOString());
    const response = await fetch(`/api/admin/events?${params}`, { credentials: "include" });
    setLoading(false);
    if (!response.ok) return;
    const body = (await response.json()) as { events?: LicenseEvent[]; total?: number };
    setEvents(body.events ?? []);
    setTotal(body.total ?? 0);
  }, [filters, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  function onFilterSubmit(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    void load();
  }

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{ad.eventsTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ad.eventsLead}</p>
      </div>

      <form onSubmit={onFilterSubmit} className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label>{ad.eventType}</Label>
          <Input value={filters.eventType} onChange={(e) => setFilters((f) => ({ ...f, eventType: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>{ad.successFilter}</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={filters.success}
            onChange={(e) => setFilters((f) => ({ ...f, success: e.target.value as typeof f.success }))}
          >
            <option value="all">{ad.filterAll}</option>
            <option value="true">{ad.successOnly}</option>
            <option value="false">{ad.failedOnly}</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>{ad.since}</Label>
          <Input type="datetime-local" value={filters.since} onChange={(e) => setFilters((f) => ({ ...f, since: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>{ad.until}</Label>
          <Input type="datetime-local" value={filters.until} onChange={(e) => setFilters((f) => ({ ...f, until: e.target.value }))} />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <Button type="submit" size="sm" variant="secondary">
            {ad.applyFilters}
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">{ad.eventType}</th>
                <th className="p-3 font-medium">{ad.successFilter}</th>
                <th className="p-3 font-medium">{ad.licenseId}</th>
                <th className="p-3 font-medium">{ad.when}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="p-3 font-mono">{row.event_type}</td>
                  <td className="p-3">{row.success ? ad.yes : ad.no}</td>
                  <td className="p-3 font-mono text-muted-foreground">{row.license_id ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{row.created_at}</td>
                </tr>
              ))}
              {events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-muted-foreground">
                    {ad.noData}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{total} {ad.totalLabel}</span>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={!canPrev} onClick={() => setOffset((o) => Math.max(0, o - limit))}>
            {ad.prevPage}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!canNext} onClick={() => setOffset((o) => o + limit)}>
            {ad.nextPage}
          </Button>
        </div>
      </div>
    </div>
  );
}