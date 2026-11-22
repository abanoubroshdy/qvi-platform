"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";

type InboxItem = {
  id: string;
  email: string;
  status: "new" | "handled";
  created_at: string;
  name?: string;
  message?: string;
  product?: string;
};

type Tab = "contact" | "waitlist";

export function AdminInboxView() {
  const { copy } = useI18n();
  const ad = copy.adminDashboard;

  const [tab, setTab] = useState<Tab>("contact");
  const [status, setStatus] = useState<"all" | "new" | "handled">("all");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (status !== "all") params.set("status", status);
    const endpoint = tab === "contact" ? "/api/admin/contact" : "/api/admin/waitlist";
    const response = await fetch(`${endpoint}?${params}`, { credentials: "include" });
    setLoading(false);
    if (!response.ok) return;
    const body = (await response.json()) as { items?: InboxItem[]; total?: number };
    setItems(body.items ?? []);
    setTotal(body.total ?? 0);
  }, [tab, status, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus(item: InboxItem) {
    setBusyId(item.id);
    const next = item.status === "new" ? "handled" : "new";
    const endpoint = tab === "contact" ? "/api/admin/contact" : "/api/admin/waitlist";
    await fetch(endpoint, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: item.id, status: next }),
    });
    setBusyId(null);
    await load();
  }

  function exportCsv() {
    window.location.href = `/api/admin/inbox/export?type=${tab}`;
  }

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{ad.inboxTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{ad.inboxLead}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
          {ad.exportCsv}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["contact", "waitlist"] as const).map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={tab === key ? "default" : "outline"}
            onClick={() => {
              setTab(key);
              setOffset(0);
            }}
          >
            {key === "contact" ? ad.contactTab : ad.waitlistTab}
          </Button>
        ))}
        {(["all", "new", "handled"] as const).map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={status === key ? "secondary" : "ghost"}
            onClick={() => {
              setStatus(key);
              setOffset(0);
            }}
          >
            {key === "all" ? ad.filterAll : key === "new" ? ad.filterNew : ad.filterHandled}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{tab === "contact" ? item.name : item.product}</p>
                <p className="text-muted-foreground">{item.email}</p>
                {tab === "contact" && item.message ? (
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">{item.message}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">{item.created_at}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={item.status === "new" ? "secondary" : "outline"}
                disabled={busyId === item.id}
                onClick={() => void toggleStatus(item)}
              >
                {item.status === "new" ? ad.markHandled : ad.markNew}
              </Button>
            </li>
          ))}
          {items.length === 0 ? <li className="p-4 text-muted-foreground">{ad.noData}</li> : null}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {total} {ad.totalLabel}
        </span>
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