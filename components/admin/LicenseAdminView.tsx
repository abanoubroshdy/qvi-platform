"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmActionDialog } from "@/components/licensing/ConfirmActionDialog";
import { KNOWN_PRODUCT_CODES, isProductCode, type ProductCode } from "@/lib/licensing/products";
import { patchLicenseListRevoked } from "@/lib/licensing/revoke-ui";

type LicenseListItem = {
  id: string;
  status: string;
  max_devices: number;
  license_key_hint: string;
  userEmail: string | null;
  activeDevices: number;
  license_products?: { code: string; name: string };
};

export function LicenseAdminView() {
  const { user, loading } = useAuth();
  const { copy, t } = useI18n();
  const la = copy.licenseAdmin;
  const router = useRouter();

  const [allowed, setAllowed] = useState<"loading" | "yes" | "no">("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [licenses, setLicenses] = useState<LicenseListItem[]>([]);
  const [events, setEvents] = useState<unknown[]>([]);
  const [confirmLicense, setConfirmLicense] = useState<LicenseListItem | null>(null);

  const [createForm, setCreateForm] = useState({
    email: "",
    productCode: KNOWN_PRODUCT_CODES[0],
    expiresAt: "",
    maxDevices: "2",
  });
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupKey, setLookupKey] = useState("");
  const [releaseForm, setReleaseForm] = useState<{
    productCode: ProductCode;
    version: string;
    channel: string;
    storagePath: string;
    sha256: string;
    releaseNotes: string;
  }>({
    productCode: KNOWN_PRODUCT_CODES[0],
    version: "",
    channel: "stable",
    storagePath: "",
    sha256: "",
    releaseNotes: "",
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/admin/licenses");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function probe() {
      const response = await fetch("/api/admin/licenses", { credentials: "include" });
      if (!active) return;
      if (response.status === 403) setAllowed("no");
      else if (response.ok) {
        setAllowed("yes");
        const body = (await response.json()) as { licenses?: LicenseListItem[] };
        setLicenses(body.licenses ?? []);
      } else setAllowed("no");
    }
    void probe();
    return () => {
      active = false;
    };
  }, [user]);

  async function loadEvents(failedOnly: boolean) {
    const response = await fetch(`/api/admin/events?failed=${failedOnly ? "1" : "0"}`, {
      credentials: "include",
    });
    if (!response.ok) return;
    const body = (await response.json()) as { events?: unknown[] };
    setEvents(body.events ?? []);
  }

  useEffect(() => {
    if (allowed !== "yes") return;
    void loadEvents(false);
  }, [allowed]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setMessageIsError(false);
    setCreatedKey(null);
    try {
      const response = await fetch("/api/admin/licenses", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: createForm.email,
          productCode: createForm.productCode,
          expiresAt: createForm.expiresAt ? new Date(createForm.expiresAt).toISOString() : null,
          maxDevices: Number(createForm.maxDevices) || 2,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessageIsError(true);
        setMessage(body.error ?? la.error);
        return;
      }
      setCreatedKey(body.licenseKeyFormatted ?? body.licenseKey);
      setMessageIsError(false);
      setMessage(la.saved);
      const list = await fetch("/api/admin/licenses", { credentials: "include" });
      if (list.ok) {
        const data = (await list.json()) as { licenses?: LicenseListItem[] };
        setLicenses(data.licenses ?? []);
      }
    } finally {
      setBusy(false);
    }
  }

  async function searchLicenses() {
    setBusy(true);
    setMessage(null);
    setMessageIsError(false);
    try {
      const params = new URLSearchParams();
      if (lookupEmail.trim()) params.set("email", lookupEmail.trim());
      if (lookupKey.trim()) params.set("key", lookupKey.trim());
      const response = await fetch(`/api/admin/licenses?${params.toString()}`, { credentials: "include" });
      if (!response.ok) {
        setMessageIsError(true);
        setMessage(la.error);
        return;
      }
      const body = (await response.json()) as { licenses?: LicenseListItem[] };
      setLicenses(body.licenses ?? []);
    } finally {
      setBusy(false);
    }
  }

  async function revokeLicenseConfirmed(row: LicenseListItem) {
    setBusy(true);
    setMessage(null);
    setMessageIsError(false);
    try {
      const response = await fetch(`/api/admin/licenses/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setMessageIsError(true);
        setMessage(body.error ?? la.revokeFailed);
        return;
      }
      setLicenses((current) => patchLicenseListRevoked(current, row.id));
      setConfirmLicense(null);
      setMessageIsError(false);
      setMessage(la.revokeSuccess);
    } finally {
      setBusy(false);
    }
  }

  async function addRelease(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
  setMessage(null);
    setMessageIsError(false);
    try {
      const response = await fetch("/api/admin/releases", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productCode: releaseForm.productCode,
          version: releaseForm.version,
          channel: releaseForm.channel,
          storagePath: releaseForm.storagePath,
          sha256: releaseForm.sha256,
          releaseNotes: releaseForm.releaseNotes,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessageIsError(true);
        setMessage(body.error ?? la.error);
        return;
      }
      setMessageIsError(false);
      setMessage(la.saved);
    } finally {
      setBusy(false);
    }
  }

  if (loading || allowed === "loading") {
    return (
      <section className="mx-auto flex min-h-[40vh] max-w-4xl items-center justify-center px-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      </section>
    );
  }

  if (allowed === "no") {
    return (
      <section className="mx-auto max-w-lg px-4 py-16">
        <p className="rounded-xl border border-border bg-card p-6 text-sm">{la.forbidden}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-8 px-4 py-12">
      <h1 className="text-2xl font-semibold">{la.title}</h1>
      {message ? (
        <p className={messageIsError ? "text-sm text-destructive" : "text-sm text-primary"} role="status">
          {message}
        </p>
      ) : null}
      {createdKey ? (
        <p className="rounded-md border border-primary/30 bg-primary/10 p-3 font-mono text-sm" role="status">
          {la.createdKey}: {createdKey}
        </p>
      ) : null}

      <form onSubmit={onCreate} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">{la.createTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="admin-email">{la.emailLabel}</Label>
            <Input
              id="admin-email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((c) => ({ ...c, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-product">{la.productLabel}</Label>
            <select
              id="admin-product"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={createForm.productCode}
              onChange={(e) =>
                setCreateForm((c) => ({
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
            <Label htmlFor="admin-expires">{la.expiresLabel}</Label>
            <Input
              id="admin-expires"
              type="date"
              value={createForm.expiresAt}
              onChange={(e) => setCreateForm((c) => ({ ...c, expiresAt: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-max">{la.maxDevicesLabel}</Label>
            <Input
              id="admin-max"
              type="number"
              min={1}
              value={createForm.maxDevices}
              onChange={(e) => setCreateForm((c) => ({ ...c, maxDevices: e.target.value }))}
            />
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? la.working : la.createCta}
        </Button>
      </form>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">{la.lookupTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lookup-email">{la.lookupEmail}</Label>
            <Input id="lookup-email" value={lookupEmail} onChange={(e) => setLookupEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lookup-key">{la.lookupKey}</Label>
            <Input id="lookup-key" value={lookupKey} onChange={(e) => setLookupKey(e.target.value)} />
          </div>
        </div>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void searchLicenses()}>
          {la.searchCta}
        </Button>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {licenses.map((row) => (
            <li key={row.id} className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {row.license_products?.name ?? row.license_products?.code} — {row.status}
                </p>
                <p className="text-muted-foreground">
                  {row.userEmail ?? "—"} · {row.license_key_hint} · {row.activeDevices}/{row.max_devices} devices
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy || row.status === "revoked"}
                onClick={() => setConfirmLicense(row)}
              >
                {la.revokeLicense}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={addRelease} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">{la.releasesTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{la.productLabel}</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={releaseForm.productCode}
              onChange={(e) =>
                setReleaseForm((c) => ({
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
            <Input
              value={releaseForm.version}
              onChange={(e) => setReleaseForm((c) => ({ ...c, version: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{la.releaseChannel}</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={releaseForm.channel}
              onChange={(e) => setReleaseForm((c) => ({ ...c, channel: e.target.value }))}
            >
              <option value="stable">stable</option>
              <option value="beta">beta</option>
              <option value="evaluation">evaluation</option>
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{la.releasePath}</Label>
            <Input
              value={releaseForm.storagePath}
              onChange={(e) => setReleaseForm((c) => ({ ...c, storagePath: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{la.releaseSha}</Label>
            <Input
              value={releaseForm.sha256}
              onChange={(e) => setReleaseForm((c) => ({ ...c, sha256: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{la.releaseNotes}</Label>
            <Input
              value={releaseForm.releaseNotes}
              onChange={(e) => setReleaseForm((c) => ({ ...c, releaseNotes: e.target.value }))}
            />
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          {la.addRelease}
        </Button>
      </form>

      <ConfirmActionDialog
        open={confirmLicense !== null}
        title={la.revokeConfirmTitle}
        description={
          confirmLicense
            ? t(la.revokeConfirmDescription, {
                product: confirmLicense.license_products?.name ?? confirmLicense.license_products?.code ?? "—",
                keyHint: confirmLicense.license_key_hint,
                email: confirmLicense.userEmail ?? "—",
              })
            : ""
        }
        confirmLabel={la.revokeConfirmCta}
        cancelLabel={la.revokeCancel}
        busy={busy}
        onConfirm={() => {
          if (confirmLicense) void revokeLicenseConfirmed(confirmLicense);
        }}
        onCancel={() => {
          if (!busy) setConfirmLicense(null);
        }}
      />

      <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{la.eventsTitle}</h2>
          <Button type="button" size="sm" variant="outline" onClick={() => void loadEvents(true)}>
            {la.eventsFailedOnly}
          </Button>
        </div>
        <ul className="max-h-80 overflow-auto font-mono text-xs text-muted-foreground">
          {events.map((event, index) => (
            <li key={index} className="border-b border-border py-2">
              {JSON.stringify(event)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}