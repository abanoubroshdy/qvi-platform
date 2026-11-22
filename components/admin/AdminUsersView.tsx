"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmActionDialog } from "@/components/licensing/ConfirmActionDialog";
import { KNOWN_PRODUCT_CODES, isProductCode } from "@/lib/licensing/products";
import { licenseStatusLabel } from "@/lib/admin/license-status-label";
import { patchLicenseListRevoked } from "@/lib/licensing/revoke-ui";

type UserSummary = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_banned: boolean;
};

type UserLicense = {
  id: string;
  status: string;
  license_key_hint: string;
  created_at: string;
  license_products?: { code: string; name: string };
};

type UserDetail = UserSummary & {
  banned_until: string | null;
  profile: Record<string, unknown> | null;
  licenses: UserLicense[];
  qv1_download_count: number;
};

export function AdminUsersView() {
  const { copy, t } = useI18n();
  const ad = copy.adminDashboard;
  const la = copy.licenseAdmin;

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmBan, setConfirmBan] = useState(false);
  const [confirmBanError, setConfirmBanError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<UserLicense | null>(null);
  const [confirmRevokeError, setConfirmRevokeError] = useState<string | null>(null);
  const [issueForm, setIssueForm] = useState({
    productCode: KNOWN_PRODUCT_CODES[0],
    expiresAt: "",
    maxDevices: "2",
  });
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const loadUsers = useCallback(async (q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "25", offset: "0" });
    if (q.trim()) params.set("q", q.trim());
    const response = await fetch(`/api/admin/users?${params}`, { credentials: "include" });
    setLoading(false);
    if (!response.ok) return;
    const body = (await response.json()) as { users?: UserSummary[]; total?: number };
    setUsers(body.users ?? []);
    setTotal(body.total ?? 0);
  }, []);

  useEffect(() => {
    void loadUsers("");
  }, [loadUsers]);

  async function loadDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    setCreatedKey(null);
    const response = await fetch(`/api/admin/users/${id}`, { credentials: "include" });
    setDetailLoading(false);
    if (!response.ok) {
      setDetail(null);
      return;
    }
    const body = (await response.json()) as { user?: UserDetail };
    setDetail(body.user ?? null);
  }

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    await loadUsers(query);
  }

  async function issueLicense(event: FormEvent) {
    event.preventDefault();
    if (!detail?.email) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/licenses", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: detail.email,
          productCode: issueForm.productCode,
          expiresAt: issueForm.expiresAt ? new Date(issueForm.expiresAt).toISOString() : null,
          maxDevices: Number(issueForm.maxDevices) || 2,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error ?? la.error);
        return;
      }
      setCreatedKey(body.licenseKeyFormatted ?? body.licenseKey);
      if (selectedId) await loadDetail(selectedId);
    } finally {
      setBusy(false);
    }
  }

  async function banConfirmed() {
    if (!selectedId) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedId}/ban`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setConfirmBanError(body.error ?? la.error);
        return;
      }
      setConfirmBan(false);
      setConfirmBanError(null);
      await loadDetail(selectedId);
      await loadUsers(query);
    } finally {
      setBusy(false);
    }
  }

  async function unbanUser() {
    if (!selectedId) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/users/${selectedId}/unban`, { method: "POST", credentials: "include" });
      await loadDetail(selectedId);
      await loadUsers(query);
    } finally {
      setBusy(false);
    }
  }

  async function revokeConfirmed(license: UserLicense) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/licenses/${license.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setConfirmRevokeError(la.revokeFailed);
        return;
      }
      if (detail) {
        setDetail({
          ...detail,
          licenses: patchLicenseListRevoked(detail.licenses, license.id),
        });
      }
      setConfirmRevoke(null);
      setConfirmRevokeError(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{ad.usersTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ad.usersLead}</p>
      </div>

      <form onSubmit={onSearch} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1 space-y-2">
          <Label htmlFor="user-search">{ad.searchUsers}</Label>
          <Input
            id="user-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ad.searchUsersPlaceholder}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={loading}>
          {loading ? la.working : ad.search}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        {t(ad.usersCount, { count: total })}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                className="flex w-full flex-col gap-1 p-4 text-start text-sm hover:bg-muted/50"
                onClick={() => void loadDetail(user.id)}
              >
                <span className="font-medium">{user.email ?? user.id}</span>
                <span className="text-xs text-muted-foreground">
                  {user.is_banned ? ad.banned : ad.active}
                </span>
              </button>
            </li>
          ))}
          {users.length === 0 && !loading ? (
            <li className="p-4 text-sm text-muted-foreground">{ad.noData}</li>
          ) : null}
        </ul>

        <div className="rounded-2xl border border-border bg-card p-6">
          {!selectedId ? (
            <p className="text-sm text-muted-foreground">{ad.selectUser}</p>
          ) : detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : !detail ? (
            <p className="text-sm text-destructive">{ad.loadError}</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">{detail.email ?? detail.id}</h2>
                <p className="text-xs text-muted-foreground">
                  {ad.qv1Downloads}: {detail.qv1_download_count}
                  {detail.is_banned ? ` · ${ad.banned}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {detail.is_banned ? (
                  <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void unbanUser()}>
                    {ad.unbanUser}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => {
                      setConfirmBanError(null);
                      setConfirmBan(true);
                    }}
                  >
                    {ad.banUser}
                  </Button>
                )}
              </div>

              {message ? <p className="text-sm text-destructive">{message}</p> : null}
              {createdKey ? (
                <p className="rounded-md border border-primary/30 bg-primary/10 p-3 font-mono text-xs">{la.createdKey}: {createdKey}</p>
              ) : null}

              <form onSubmit={issueLicense} className="space-y-3 border-t border-border pt-4">
                <h3 className="text-sm font-semibold">{ad.issueLicense}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{la.productLabel}</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={issueForm.productCode}
                      onChange={(e) =>
                        setIssueForm((c) => ({
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
                  <div className="space-y-1">
                    <Label>{la.expiresLabel}</Label>
                    <Input
                      type="date"
                      value={issueForm.expiresAt}
                      onChange={(e) => setIssueForm((c) => ({ ...c, expiresAt: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{la.maxDevicesLabel}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={issueForm.maxDevices}
                      onChange={(e) => setIssueForm((c) => ({ ...c, maxDevices: e.target.value }))}
                    />
                  </div>
                </div>
                <Button type="submit" size="sm" disabled={busy || !detail.email}>
                  {busy ? la.working : ad.issueLicense}
                </Button>
              </form>

              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="text-sm font-semibold">{ad.userLicenses}</h3>
                <ul className="divide-y divide-border text-sm">
                  {detail.licenses.map((license) => (
                    <li key={license.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        {license.license_products?.name ?? license.license_products?.code} —{" "}
                        {licenseStatusLabel(license.status, copy)} · {license.license_key_hint}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={busy || license.status === "revoked"}
                        onClick={() => {
                          setConfirmRevokeError(null);
                          setConfirmRevoke(license);
                        }}
                      >
                        {la.revokeLicense}
                      </Button>
                    </li>
                  ))}
                  {detail.licenses.length === 0 ? (
                    <li className="py-2 text-muted-foreground">{ad.noData}</li>
                  ) : null}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmActionDialog
        open={confirmBan}
        title={ad.banConfirmTitle}
        description={detail?.email ? t(ad.banConfirmDescription, { email: detail.email }) : ""}
        confirmLabel={ad.banConfirmCta}
        cancelLabel={la.revokeCancel}
        busy={busy}
        errorMessage={confirmBanError}
        onConfirm={() => void banConfirmed()}
        onCancel={() => {
          if (!busy) {
            setConfirmBan(false);
            setConfirmBanError(null);
          }
        }}
      />

      <ConfirmActionDialog
        open={confirmRevoke !== null}
        title={la.revokeConfirmTitle}
        description={
          confirmRevoke
            ? t(la.revokeConfirmDescription, {
                product: confirmRevoke.license_products?.name ?? confirmRevoke.license_products?.code ?? "—",
                keyHint: confirmRevoke.license_key_hint,
                email: detail?.email ?? "—",
              })
            : ""
        }
        confirmLabel={la.revokeConfirmCta}
        cancelLabel={la.revokeCancel}
        busy={busy}
        errorMessage={confirmRevokeError}
        onConfirm={() => {
          if (confirmRevoke) void revokeConfirmed(confirmRevoke);
        }}
        onCancel={() => {
          if (!busy) {
            setConfirmRevoke(null);
            setConfirmRevokeError(null);
          }
        }}
      />
    </div>
  );
}