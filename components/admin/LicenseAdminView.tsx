"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmActionDialog } from "@/components/licensing/ConfirmActionDialog";
import { KNOWN_PRODUCT_CODES, isProductCode, type ProductCode } from "@/lib/licensing/products";
import { licenseStatusLabel } from "@/lib/admin/license-status-label";
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
  const { copy, t } = useI18n();
  const la = copy.licenseAdmin;
  const ad = copy.adminDashboard;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [licenses, setLicenses] = useState<LicenseListItem[]>([]);
  const [confirmLicense, setConfirmLicense] = useState<LicenseListItem | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    email: "",
    productCode: KNOWN_PRODUCT_CODES[0] as ProductCode,
    expiresAt: "",
    maxDevices: "2",
  });
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupKey, setLookupKey] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await fetch("/api/admin/licenses", { credentials: "include" });
      if (!active || !response.ok) return;
      const body = (await response.json()) as { licenses?: LicenseListItem[] };
      setLicenses(body.licenses ?? []);
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

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
        setConfirmError(body.error ?? la.revokeFailed);
        return;
      }
      setLicenses((current) => patchLicenseListRevoked(current, row.id));
      setConfirmLicense(null);
      setConfirmError(null);
      setMessageIsError(false);
      setMessage(la.revokeSuccess);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{ad.nav.licenses}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{la.title}</p>
      </div>

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
                  {row.license_products?.name ?? row.license_products?.code} —{" "}
                  {licenseStatusLabel(row.status, copy)}
                </p>
                <p className="text-muted-foreground">
                  {row.userEmail ?? ad.emDash} · {row.license_key_hint} · {row.activeDevices}/{row.max_devices}{" "}
                  {ad.devicesShort}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy || row.status === "revoked"}
                onClick={() => {
                  setConfirmError(null);
                  setConfirmLicense(row);
                }}
              >
                {la.revokeLicense}
              </Button>
            </li>
          ))}
        </ul>
      </div>

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
        errorMessage={confirmError}
        onConfirm={() => {
          if (confirmLicense) void revokeLicenseConfirmed(confirmLicense);
        }}
        onCancel={() => {
          if (!busy) {
            setConfirmLicense(null);
            setConfirmError(null);
          }
        }}
      />
    </div>
  );
}