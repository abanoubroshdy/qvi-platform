"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import type { UserLicenseSummary } from "@/lib/supabase/licensing";
import { ConfirmActionDialog } from "@/components/licensing/ConfirmActionDialog";
import { Button } from "@/components/ui/button";
import { patchUserLicenseDeviceRevoked } from "@/lib/licensing/revoke-ui";
import { LicenseKeyOneTimeBox } from "@/components/licensing/LicenseKeyOneTimeBox";
import { TrialActivatePanel } from "@/components/licensing/TrialActivatePanel";
import { TrialBadge } from "@/components/licensing/TrialBadge";
import { usePublicTrialSettings } from "@/components/neyora/usePublicTrialSettings";
import { PRODUCT_CODES } from "@/lib/licensing/products";
import { trialDaysRemaining } from "@/lib/licensing/trial-settings";

export function AccountLicensesSection() {
  const { user } = useAuth();
  const { copy, locale, t } = useI18n();
  const a = copy.auth;

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; rows: UserLicenseSummary[] }
  >({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [confirmDevice, setConfirmDevice] = useState<{
    deviceId: string;
    deviceName: string;
    productName: string;
  } | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const { settings: trialSettings } = usePublicTrialSettings(PRODUCT_CODES.neyoraPro);

  const reload = useCallback(async () => {
    if (!user) return;
    const response = await fetch("/api/account/licenses", { credentials: "include" });
    if (!response.ok) {
      setState({ status: "error" });
      return;
    }
    const body = (await response.json()) as { licenses?: UserLicenseSummary[] };
    setState({ status: "ready", rows: body.licenses ?? [] });
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function showLicenseKey(licenseId: string) {
    setBusyId(licenseId);
    setNotice(null);
    setRevealedKey(null);
    setNoticeIsError(false);
    try {
      const response = await fetch(`/api/account/licenses/${licenseId}/key`, { credentials: "include" });
      const body = (await response.json()) as { licenseKeyFormatted?: string; error?: string; code?: string };
      if (!response.ok) {
        setNoticeIsError(true);
        setNotice(body.code === "legacy" ? a.licensesLegacyKeyMessage : body.error ?? a.licensesShowKeyFailed);
        return;
      }
      setRevealedKey(body.licenseKeyFormatted ?? null);
    } finally {
      setBusyId(null);
    }
  }

  async function emailLicenseKey(licenseId: string) {
    setBusyId(licenseId);
    setNotice(null);
    setNoticeIsError(false);
    try {
      const response = await fetch(`/api/account/licenses/${licenseId}/email-key`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const body = (await response.json()) as { error?: string; code?: string };
      if (!response.ok) {
        setNoticeIsError(true);
        setNotice(
          body.code === "legacy" ? a.licensesLegacyKeyMessage : body.error ?? a.licensesEmailKeyFailed,
        );
        return;
      }
      setNoticeIsError(false);
      setNotice(a.licensesEmailKeySent);
    } finally {
      setBusyId(null);
    }
  }

  async function deactivateDeviceConfirmed(deviceId: string) {
    setBusyId(deviceId);
    setNotice(null);
    setNoticeIsError(false);
    try {
      const response = await fetch("/api/account/license-devices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ deviceId }),
      });
      if (!response.ok) {
        setConfirmError(a.licensesDeactivateFailed);
        return;
      }
      const revokedAt = new Date().toISOString();
      setState((current) => {
        if (current.status !== "ready") return current;
        return {
          status: "ready",
          rows: patchUserLicenseDeviceRevoked(current.rows, deviceId, revokedAt),
        };
      });
      setConfirmDevice(null);
      setConfirmError(null);
      setNoticeIsError(false);
      setNotice(a.licensesDeviceDeactivated);
    } finally {
      setBusyId(null);
    }
  }

  const neyoraLicenses =
    state.status === "ready"
      ? state.rows.filter((row) => row.product.code === PRODUCT_CODES.neyoraPro)
      : [];
  const canStartNeyoraTrial =
    trialSettings.enabled &&
    state.status === "ready" &&
    neyoraLicenses.length === 0;

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h2 className="text-sm font-semibold">{a.licensesTitle}</h2>
      {canStartNeyoraTrial ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">{a.trialSectionTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{a.trialStartLead}</p>
          <TrialActivatePanel
            className="mt-4"
            durationDays={trialSettings.duration_days}
            showConsent
            isLoggedIn={Boolean(user)}
            loginNextPath="/account"
            onActivated={() => void reload()}
          />
        </div>
      ) : null}
      <ConfirmActionDialog
        open={confirmDevice !== null}
        title={a.licensesDeactivateConfirmTitle}
        description={
          confirmDevice
            ? t(a.licensesDeactivateConfirmDescription, {
                product: confirmDevice.productName,
                deviceName: confirmDevice.deviceName,
              })
            : ""
        }
        confirmLabel={a.licensesDeactivateConfirmCta}
        cancelLabel={a.licensesDeactivateCancel}
        busy={Boolean(busyId)}
        errorMessage={confirmError}
        onConfirm={() => {
          if (confirmDevice) void deactivateDeviceConfirmed(confirmDevice.deviceId);
        }}
        onCancel={() => {
          if (!busyId) {
            setConfirmDevice(null);
            setConfirmError(null);
          }
        }}
      />

      {notice ? (
        <p className={noticeIsError ? "text-sm text-destructive" : "text-sm text-primary"} role="status">
          {notice}
        </p>
      ) : null}
      {revealedKey ? (
        <LicenseKeyOneTimeBox
          licenseKey={revealedKey}
          title={copy.licenseAdmin.createdKey}
          warning={a.licensesKeyNote}
          copyLabel={a.licensesCopyKey}
          copiedLabel={a.licensesCopiedKey}
          dismissLabel={a.licensesDismissKey}
          onDismiss={() => setRevealedKey(null)}
        />
      ) : null}
      {state.status === "loading" ? (
        <p className="text-sm text-muted-foreground">{a.loading}</p>
      ) : state.status === "error" ? (
        <p className="text-sm text-muted-foreground">{a.licensesUnavailable}</p>
      ) : state.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{a.licensesEmpty}</p>
      ) : (
        <ul className="space-y-4">
          {state.rows.map((license) => {
            const activeDevices = license.devices.filter((d) => !d.revoked_at);
            return (
              <li key={license.id} className="rounded-xl border border-border p-4">
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{a.licensesProduct}</dt>
                    <dd className="flex flex-wrap items-center gap-2 font-medium">
                      <span>{license.product.name}</span>
                      {license.is_trial ? <TrialBadge /> : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{a.licensesStatus}</dt>
                    <dd className="font-medium">{license.status}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{a.licensesExpires}</dt>
                    <dd className="font-medium">
                      {license.expires_at
                        ? new Date(license.expires_at).toLocaleDateString(locale === "ar" ? "ar" : undefined)
                        : a.licensesNeverExpires}
                      {license.is_trial && license.expires_at ? (
                        <span className="ms-2 text-xs font-normal text-primary tabular-nums">
                          {t(a.trialDaysRemaining, {
                            days: String(trialDaysRemaining(license.expires_at) ?? 0),
                          })}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{a.licensesKeyHint}</dt>
                    <dd className="font-mono text-xs">{license.license_key_hint}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {t(a.licensesDeviceLimit, {
                      active: String(activeDevices.length),
                      max: String(license.max_devices),
                    })}
                  </p>
                  {license.status === "active" ? (
                    <div className="flex flex-col items-stretch gap-2 sm:items-end">
                      {license.hasRetrievableKey ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={Boolean(busyId)}
                            onClick={() => void showLicenseKey(license.id)}
                          >
                            {busyId === license.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                {a.working}
                              </>
                            ) : (
                              a.licensesShowKey
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={Boolean(busyId)}
                            onClick={() => void emailLicenseKey(license.id)}
                          >
                            {a.licensesEmailKey}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{a.licensesLegacyKeyNote}</p>
                      )}
                    </div>
                  ) : null}
                </div>
                {activeDevices.length > 0 ? (
                  <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                    {activeDevices.map((device) => (
                      <li key={device.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm">
                          <p className="font-medium">{device.device_name || a.licensesDeviceName}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.licensesLastSeen}{" "}
                            {new Date(device.last_seen_at).toLocaleString(locale === "ar" ? "ar" : "en-GB", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === device.id}
                          onClick={() =>
                            setConfirmDevice({
                              deviceId: device.id,
                              deviceName: device.device_name || a.licensesDeviceName,
                              productName: license.product.name,
                            })
                          }
                        >
                          {busyId === device.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              {a.licensesDeactivating}
                            </>
                          ) : (
                            a.licensesDeactivateDevice
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}