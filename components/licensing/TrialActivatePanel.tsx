"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { LicenseKeyOneTimeBox } from "@/components/licensing/LicenseKeyOneTimeBox";
import { Button } from "@/components/ui/button";
import { localizeHref } from "@/lib/i18n/locale-path";
import { useRouter } from "next/navigation";

type TrialActivatePanelProps = {
  durationDays: number;
  showConsent?: boolean;
  onActivated?: () => void;
  className?: string;
  loginNextPath?: string;
  isLoggedIn: boolean;
};

export function TrialActivatePanel({
  durationDays,
  showConsent = false,
  onActivated,
  className,
  loginNextPath = "/products/neyora",
  isLoggedIn,
}: TrialActivatePanelProps) {
  const { copy, locale, t } = useI18n();
  const auth = copy.auth;
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metaConsent, setMetaConsent] = useState(false);
  const [audioConsent, setAudioConsent] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);

  async function activate() {
    if (!isLoggedIn) {
      router.push(localizeHref(`/login?next=${encodeURIComponent(loginNextPath)}`, locale));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/licenses/trial", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productCode: "NEYORA_PRO",
          locale,
          training_metadata_consent: metaConsent,
          training_audio_consent: audioConsent,
        }),
      });
      const body = (await response.json()) as {
        licenseKeyFormatted?: string;
        error?: string;
        errorCode?: string;
      };
      if (!response.ok) {
        setError(body.error ?? auth.trialActivateFailed);
        return;
      }
      setLicenseKey(body.licenseKeyFormatted ?? null);
      onActivated?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      {licenseKey ? (
        <LicenseKeyOneTimeBox
          licenseKey={licenseKey}
          title={copy.licenseAdmin.createdKey}
          warning={auth.licensesOneTimeWarning}
          copyLabel={auth.licensesCopyKey}
          copiedLabel={auth.licensesCopiedKey}
          dismissLabel={auth.licensesDismissKey}
          onDismiss={() => setLicenseKey(null)}
        />
      ) : null}
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {showConsent ? (
        <div className="mb-4 space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-[#4ADE80]" aria-hidden />
            <p className="text-slate-600 dark:text-[#CBD5E1]">
              {t(copy.products.neyora.optInBody, { days: String(durationDays) })}
            </p>
          </div>
          <label className="flex items-center gap-2 text-slate-800 dark:text-[#F3F4F6]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={metaConsent}
              onChange={(e) => setMetaConsent(e.target.checked)}
            />
            {auth.trialConsentMeta}
          </label>
          <label className="flex items-center gap-2 text-slate-800 dark:text-[#F3F4F6]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={audioConsent}
              onChange={(e) => setAudioConsent(e.target.checked)}
            />
            {auth.trialConsentAudio}
          </label>
        </div>
      ) : null}
      <Button
        type="button"
        className="min-h-[48px] w-full bg-[#FBBF24] font-bold text-[#1C1814] hover:bg-[#FCD34D] sm:w-auto"
        disabled={busy}
        onClick={() => void activate()}
      >
        {busy ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />
            {auth.trialActivateBusy}
          </>
        ) : isLoggedIn ? (
          t(copy.products.neyora.primaryCta, { days: String(durationDays) })
        ) : (
          copy.products.neyora.loginToTrial
        )}
      </Button>
    </div>
  );
}