"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmActionDialog } from "@/components/licensing/ConfirmActionDialog";
import { KNOWN_PRODUCT_CODES, isProductCode, type ProductCode } from "@/lib/licensing/products";

type ReleaseRow = {
  id: string;
  product_code: string;
  version: string;
  channel: string;
  sha256: string;
  release_notes: string | null;
  is_published: boolean;
  created_at: string;
};

export function AdminReleasesView() {
  const { copy, t } = useI18n();
  const ad = copy.adminDashboard;
  const la = copy.licenseAdmin;

  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    productCode: KNOWN_PRODUCT_CODES[0] as ProductCode,
    version: "",
    channel: "stable",
    storagePath: "",
    sha256: "",
    releaseNotes: "",
    isPublished: true,
  });

  async function loadReleases() {
    setLoading(true);
    const response = await fetch("/api/admin/releases", { credentials: "include" });
    setLoading(false);
    if (!response.ok) return;
    const body = (await response.json()) as { releases?: ReleaseRow[] };
    setReleases(body.releases ?? []);
  }

  useEffect(() => {
    void loadReleases();
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/releases", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productCode: form.productCode,
          version: form.version,
          channel: form.channel,
          storagePath: form.storagePath,
          sha256: form.sha256,
          releaseNotes: form.releaseNotes,
          isPublished: form.isPublished,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error ?? la.error);
        return;
      }
      setMessage(la.saved);
      setForm((f) => ({ ...f, version: "", storagePath: "", sha256: "", releaseNotes: "" }));
      await loadReleases();
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(row: ReleaseRow) {
    setBusy(true);
    await fetch(`/api/admin/releases/${row.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isPublished: !row.is_published }),
    });
    setBusy(false);
    await loadReleases();
  }

  async function deleteConfirmed() {
    if (!deleteId) return;
    setBusy(true);
    await fetch(`/api/admin/releases/${deleteId}`, { method: "DELETE", credentials: "include" });
    setBusy(false);
    setDeleteId(null);
    await loadReleases();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{ad.releasesTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ad.releasesLead}</p>
      </div>

      {message ? <p className="text-sm text-primary">{message}</p> : null}

      <form onSubmit={onCreate} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">{ad.createRelease}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{la.productLabel}</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.productCode}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  productCode: isProductCode(e.target.value) ? e.target.value : c.productCode,
                }))
              }
            >
              {KNOWN_PRODUCT_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>{la.releaseVersion}</Label>
            <Input value={form.version} onChange={(e) => setForm((c) => ({ ...c, version: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label>{la.releaseChannel}</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.channel}
              onChange={(e) => setForm((c) => ({ ...c, channel: e.target.value }))}
            >
              <option value="stable">{ad.releaseChannels.stable}</option>
              <option value="beta">{ad.releaseChannels.beta}</option>
              <option value="evaluation">{ad.releaseChannels.evaluation}</option>
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{la.releasePath}</Label>
            <Input
              value={form.storagePath}
              onChange={(e) => setForm((c) => ({ ...c, storagePath: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{la.releaseSha}</Label>
            <Input value={form.sha256} onChange={(e) => setForm((c) => ({ ...c, sha256: e.target.value }))} required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{la.releaseNotes}</Label>
            <Input value={form.releaseNotes} onChange={(e) => setForm((c) => ({ ...c, releaseNotes: e.target.value }))} />
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? la.working : la.addRelease}
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
          {releases.map((row) => (
            <li key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {row.product_code} · v{row.version} ·{" "}
                  {ad.releaseChannels[row.channel as keyof typeof ad.releaseChannels] ?? row.channel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.is_published ? ad.published : ad.draft} · {row.sha256.slice(0, 12)}…
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void togglePublished(row)}>
                  {row.is_published ? ad.unpublish : ad.publish}
                </Button>
                <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => setDeleteId(row.id)}>
                  {ad.delete}
                </Button>
              </div>
            </li>
          ))}
          {releases.length === 0 ? <li className="p-4 text-muted-foreground">{ad.noData}</li> : null}
        </ul>
      )}

      <ConfirmActionDialog
        open={deleteId !== null}
        title={ad.deleteReleaseTitle}
        description={deleteId ? t(ad.deleteReleaseDescription, { id: deleteId }) : ""}
        confirmLabel={ad.delete}
        cancelLabel={la.revokeCancel}
        busy={busy}
        onConfirm={() => void deleteConfirmed()}
        onCancel={() => {
          if (!busy) setDeleteId(null);
        }}
      />
    </div>
  );
}