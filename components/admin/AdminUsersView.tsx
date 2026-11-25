"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmActionDialog } from "@/components/licensing/ConfirmActionDialog";
import { AdminTypedConfirmDialog } from "@/components/admin/AdminTypedConfirmDialog";
import { KNOWN_PRODUCT_CODES, isProductCode } from "@/lib/licensing/products";
import { formatAdminDateTime } from "@/lib/admin/format";
import { licenseStatusLabel } from "@/lib/admin/license-status-label";
import { DELETE_CONFIRM_KEYWORD } from "@/lib/admin/user-delete";
import { patchLicenseListRevoked } from "@/lib/licensing/revoke-ui";
import { LicenseKeyOneTimeBox } from "@/components/licensing/LicenseKeyOneTimeBox";

type UserSummary = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_banned: boolean;
  email_confirmed?: boolean;
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

type UserFilters = {
  unconfirmedOnly: boolean;
  neverSignedIn: boolean;
  createdSince: string;
  createdUntil: string;
};

const defaultFilters: UserFilters = {
  unconfirmedOnly: false,
  neverSignedIn: false,
  createdSince: "",
  createdUntil: "",
};

const PAGE_SIZE = 25;

function buildSearchParams(
  query: string,
  offset: number,
  filters: UserFilters,
): URLSearchParams {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  if (query.trim()) params.set("q", query.trim());
  if (filters.unconfirmedOnly) params.set("unconfirmed", "1");
  if (filters.neverSignedIn) params.set("never_signed_in", "1");
  if (filters.createdSince) {
    params.set("created_since", new Date(filters.createdSince).toISOString());
  }
  if (filters.createdUntil) {
    const end = new Date(filters.createdUntil);
    end.setHours(23, 59, 59, 999);
    params.set("created_until", end.toISOString());
  }
  return params;
}

export function AdminUsersView() {
  const { copy, t, locale } = useI18n();
  const ad = copy.adminDashboard;
  const la = copy.licenseAdmin;
  const localeTag = locale === "ar" ? "ar" : "en";

  const [query, setQuery] = useState("");
  const [draftFilters, setDraftFilters] = useState<UserFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<UserFilters>(defaultFilters);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmBan, setConfirmBan] = useState(false);
  const [confirmBanError, setConfirmBanError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<UserLicense | null>(null);
  const [confirmRevokeError, setConfirmRevokeError] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState<UserLicense | null>(null);
  const [confirmRegenerateError, setConfirmRegenerateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserSummary | null>(null);
  const [deleteTargetError, setDeleteTargetError] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [issueForm, setIssueForm] = useState({
    productCode: KNOWN_PRODUCT_CODES[0],
    expiresAt: "",
    maxDevices: "2",
  });
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const mapDeleteError = useCallback(
    (code?: string, fallback?: string) => {
      const key = code as keyof typeof ad.deleteErrors | undefined;
      if (key && ad.deleteErrors[key]) return ad.deleteErrors[key];
      return fallback ?? ad.deleteErrors.generic;
    },
    [ad.deleteErrors],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const params = buildSearchParams(query, offset, appliedFilters);
    const response = await fetch(`/api/admin/users?${params}`, { credentials: "include" });
    setLoading(false);
    if (!response.ok) return;
    const body = (await response.json()) as { users?: UserSummary[]; total?: number };
    setUsers(body.users ?? []);
    setTotal(body.total ?? 0);
    setSelected((current) => {
      const next = new Set<string>();
      Array.from(current).forEach((id) => {
        if ((body.users ?? []).some((u) => u.id === id)) next.add(id);
      });
      return next;
    });
  }, [query, offset, appliedFilters]);

  useEffect(() => {
    void loadUsers();
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

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setAppliedFilters(draftFilters);
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllOnPage() {
    setSelected(new Set(users.map((u) => u.id)));
  }

  async function issueLicense(event: FormEvent) {
    event.preventDefault();
    if (!detail?.email) return;
    setBusy(true);
    setMessage(null);
    setCreatedKey(null);
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
      await loadUsers();
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
      await loadUsers();
    } finally {
      setBusy(false);
    }
  }

  async function regenerateConfirmed(license: UserLicense) {
    setBusy(true);
    setCreatedKey(null);
    try {
      const response = await fetch(`/api/admin/licenses/${license.id}/regenerate`, {
        method: "POST",
        credentials: "include",
      });
      const body = (await response.json()) as {
        licenseKeyFormatted?: string;
        licenseKey?: string;
        error?: string;
      };
      if (!response.ok) {
        setConfirmRegenerateError(body.error ?? la.regenerateFailed);
        return;
      }
      setCreatedKey(body.licenseKeyFormatted ?? body.licenseKey ?? null);
      setConfirmRegenerate(null);
      setConfirmRegenerateError(null);
      if (selectedId) await loadDetail(selectedId);
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

  async function deleteUserConfirmed() {
    if (!deleteTarget) return;
    setBusy(true);
    setDeleteTargetError(null);
    try {
      const response = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!response.ok) {
        setDeleteTargetError(mapDeleteError(body.code, body.error));
        return;
      }
      setDeleteTarget(null);
      if (selectedId === deleteTarget.id) {
        setSelectedId(null);
        setDetail(null);
      }
      setSelected((s) => {
        const next = new Set(s);
        next.delete(deleteTarget.id);
        return next;
      });
      await loadUsers();
    } finally {
      setBusy(false);
    }
  }

  async function bulkDeleteConfirmed() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBusy(true);
    setBulkDeleteError(null);
    try {
      const response = await fetch("/api/admin/users/bulk-delete", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        failed?: Array<{ id: string; error: string }>;
        deleted?: string[];
      };
      if (!response.ok) {
        setBulkDeleteError(mapDeleteError(undefined, (body as { error?: string }).error));
        return;
      }
      const deleted = body.deleted ?? [];
      if (deleted.length > 0) {
        setSelected((current) => {
          const next = new Set(current);
          for (const id of deleted) next.delete(id);
          return next;
        });
        if (selectedId && deleted.includes(selectedId)) {
          setSelectedId(null);
          setDetail(null);
        }
      }
      if (body.failed?.length) {
        setBulkDeleteError(`${ad.deleteErrors.generic} (${body.failed.length}/${ids.length})`);
      } else {
        setBulkDeleteOpen(false);
        setBulkDeleteError(null);
        setSelected(new Set());
      }
      await loadUsers();
    } finally {
      setBusy(false);
    }
  }

  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;
  const selectedCount = selected.size;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{ad.usersTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ad.usersLead}</p>
      </div>

      <form onSubmit={onSearch} className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
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
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draftFilters.unconfirmedOnly}
              onChange={(e) => setDraftFilters((f) => ({ ...f, unconfirmedOnly: e.target.checked }))}
            />
            {ad.filterUnconfirmed}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draftFilters.neverSignedIn}
              onChange={(e) => setDraftFilters((f) => ({ ...f, neverSignedIn: e.target.checked }))}
            />
            {ad.filterNeverSignedIn}
          </label>
          <div className="space-y-1">
            <Label>{ad.filterCreatedSince}</Label>
            <Input
              type="date"
              value={draftFilters.createdSince}
              onChange={(e) => setDraftFilters((f) => ({ ...f, createdSince: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>{ad.filterCreatedUntil}</Label>
            <Input
              type="date"
              value={draftFilters.createdUntil}
              onChange={(e) => setDraftFilters((f) => ({ ...f, createdUntil: e.target.value }))}
            />
          </div>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {t(ad.usersCount, { count: total })}
          {selectedCount > 0 ? ` · ${t(ad.selectedCount, { count: selectedCount })}` : ""}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={selectAllOnPage}>
            {ad.selectAllOnPage}
          </Button>
          {selectedCount > 0 ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setSelected(new Set())}>
                {ad.clearSelection}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  setBulkDeleteError(null);
                  setBulkDeleteOpen(true);
                }}
              >
                {ad.deleteSelected}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {users.map((user) => (
            <li key={user.id} className="flex items-stretch gap-2 p-2">
              <label className="flex shrink-0 items-center px-2">
                <input
                  type="checkbox"
                  checked={selected.has(user.id)}
                  onChange={() => toggleSelected(user.id)}
                  aria-label={user.email ?? user.id}
                />
              </label>
              <button
                type="button"
                className="flex min-w-0 flex-1 flex-col gap-1 p-2 text-start text-sm hover:bg-muted/50 rounded-lg"
                onClick={() => void loadDetail(user.id)}
              >
                <span className="font-medium break-all">{user.email ?? user.id}</span>
                <span className="text-xs text-muted-foreground">
                  {user.is_banned ? ad.banned : ad.active}
                  {user.email_confirmed === false ? ` · ${ad.emailUnconfirmed}` : ""}
                  {user.last_sign_in_at === null ? ` · ${ad.filterNeverSignedIn}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatAdminDateTime(user.created_at, localeTag)}
                </span>
              </button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="shrink-0 self-center"
                onClick={() => {
                  setDeleteTargetError(null);
                  setDeleteTarget(user);
                }}
              >
                {ad.deleteUser}
              </Button>
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
                <h2 className="text-lg font-semibold break-all">{detail.email ?? detail.id}</h2>
                <p className="text-xs text-muted-foreground">
                  {ad.qv1Downloads}: {detail.qv1_download_count}
                  {detail.is_banned ? ` · ${ad.banned}` : ""}
                  {detail.email_confirmed === false ? ` · ${ad.emailUnconfirmed}` : ""}
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
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => {
                    setDeleteTargetError(null);
                    setDeleteTarget(detail);
                  }}
                >
                  {ad.deleteUser}
                </Button>
              </div>

              {message ? <p className="text-sm text-destructive">{message}</p> : null}
              {createdKey ? (
                <LicenseKeyOneTimeBox
                  licenseKey={createdKey}
                  title={la.createdKey}
                  warning={la.oneTimeWarning}
                  copyLabel={la.copyKey}
                  copiedLabel={la.copiedKey}
                  dismissLabel={la.dismissKey}
                  onDismiss={() => setCreatedKey(null)}
                />
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
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy || license.status !== "active"}
                          onClick={() => {
                            setConfirmRegenerateError(null);
                            setConfirmRegenerate(license);
                          }}
                        >
                          {la.regenerateKey}
                        </Button>
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
                      </div>
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

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{total} {ad.totalLabel}</span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canPrev}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            {ad.prevPage}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!canNext} onClick={() => setOffset((o) => o + PAGE_SIZE)}>
            {ad.nextPage}
          </Button>
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
        open={confirmRegenerate !== null}
        title={la.regenerateConfirmTitle}
        description={la.regenerateConfirmDescription}
        confirmLabel={la.regenerateConfirmCta}
        cancelLabel={la.regenerateCancel}
        busy={busy}
        errorMessage={confirmRegenerateError}
        onConfirm={() => {
          if (confirmRegenerate) void regenerateConfirmed(confirmRegenerate);
        }}
        onCancel={() => {
          if (!busy) {
            setConfirmRegenerate(null);
            setConfirmRegenerateError(null);
          }
        }}
      />

      <ConfirmActionDialog
        open={confirmRevoke !== null}
        title={la.revokeConfirmTitle}
        description={
          confirmRevoke
            ? t(la.revokeConfirmDescription, {
                product: confirmRevoke.license_products?.name ?? confirmRevoke.license_products?.code ?? ad.emDash,
                keyHint: confirmRevoke.license_key_hint,
                email: detail?.email ?? ad.emDash,
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

      <AdminTypedConfirmDialog
        open={deleteTarget !== null}
        title={ad.deleteUserTitle}
        description={
          deleteTarget
            ? t(ad.deleteUserDescription, { email: deleteTarget.email ?? deleteTarget.id })
            : ""
        }
        confirmLabel={ad.deleteUserConfirmCta}
        cancelLabel={la.revokeCancel}
        typeToConfirmLabel={ad.typeToConfirm}
        expectedPhrase={deleteTarget?.email ?? DELETE_CONFIRM_KEYWORD}
        allowDeleteKeyword
        busy={busy}
        errorMessage={deleteTargetError}
        onConfirm={() => void deleteUserConfirmed()}
        onCancel={() => {
          if (!busy) {
            setDeleteTarget(null);
            setDeleteTargetError(null);
          }
        }}
      />

      <AdminTypedConfirmDialog
        open={bulkDeleteOpen}
        title={ad.deleteBulkTitle}
        description={t(ad.deleteBulkDescription, { count: selectedCount })}
        confirmLabel={ad.deleteUserConfirmCta}
        cancelLabel={la.revokeCancel}
        typeToConfirmLabel={ad.typeToConfirm}
        expectedPhrase={DELETE_CONFIRM_KEYWORD}
        allowDeleteKeyword={false}
        busy={busy}
        errorMessage={bulkDeleteError}
        onConfirm={() => void bulkDeleteConfirmed()}
        onCancel={() => {
          if (!busy) {
            setBulkDeleteOpen(false);
            setBulkDeleteError(null);
          }
        }}
      />
    </div>
  );
}