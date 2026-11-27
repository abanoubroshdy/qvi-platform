"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import type { PublicReleaseMetadata } from "@/lib/licensing/types";
import { formatReleaseFileSize } from "@/lib/licensing/public-release";
import { PRODUCT_CODES } from "@/lib/licensing/products";
import { LocaleLink } from "@/components/LocaleLink";
import { TrialActivatePanel } from "@/components/licensing/TrialActivatePanel";
import { usePublicTrialSettings } from "@/components/neyora/usePublicTrialSettings";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { localizeHref } from "@/lib/i18n/locale-path";
import { cn } from "@/lib/utils";

const neyoraCard =
  "rounded-2xl border border-slate-200 bg-white dark:border-[#4A4037] dark:bg-[#2A2420]";
const neyoraHeading = "text-slate-900 dark:text-[#F3F4F6]";
const neyoraMuted = "text-slate-600 dark:text-[#CBD5E1]";
const neyoraAccent = "text-amber-800 dark:text-[#FBBF24]";
const neyoraSecondaryBtn =
  "min-h-[48px] w-full border-slate-300 bg-transparent text-slate-900 shadow-none hover:bg-slate-100 dark:border-[#4A4037] dark:bg-[#2A2420] dark:text-[#F3F4F6] dark:hover:bg-[#352E28] sm:w-auto";
const neyoraFullLicenseBtn =
  "min-h-[48px] w-full border-slate-300 bg-transparent text-slate-900 shadow-none hover:bg-slate-100 dark:border-[#4A4037] dark:bg-[#2A2420] dark:text-[#F3F4F6] dark:hover:bg-[#352E28]";
const neyoraPrimaryBtn =
  "min-h-[48px] bg-[#FBBF24] font-bold text-[#1C1814] shadow-none hover:bg-[#FCD34D] hover:text-[#1C1814]";
const neyoraSectionDivider = "border-slate-200/80 dark:border-[#3E362F]/50";

export function NeyoraView() {
  const { copy, locale, t } = useI18n();
  const page = copy.products.neyora;
  const { user } = useAuth();
  const { settings } = usePublicTrialSettings();
  const days = settings.duration_days;
  const [activeInstrument, setActiveInstrument] = useState(page.instruments[0]?.id ?? "ney");
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [publicRelease, setPublicRelease] = useState<PublicReleaseMetadata | null | undefined>(undefined);
  const [canDownload, setCanDownload] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/products/neyora/release");
        if (!response.ok) {
          if (!cancelled) setPublicRelease(null);
          return;
        }
        const body = (await response.json()) as { release?: PublicReleaseMetadata | null };
        if (!cancelled) setPublicRelease(body.release ?? null);
      } catch {
        if (!cancelled) setPublicRelease(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setCanDownload(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/account/licenses", { credentials: "include" });
      if (!response.ok) {
        if (!cancelled) setCanDownload(false);
        return;
      }
      const body = (await response.json()) as {
        licenses?: Array<{ status: string; expires_at: string | null; product: { code: string } }>;
      };
      const active = (body.licenses ?? []).some((license) => {
        if (license.product.code !== PRODUCT_CODES.neyoraPro) return false;
        if (license.status !== "active") return false;
        if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) return false;
        return true;
      });
      if (!cancelled) setCanDownload(active);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loginPath = useMemo(
    () => localizeHref(`/login?next=${encodeURIComponent(localizeHref("/products/neyora", locale))}`, locale),
    [locale],
  );

  function scrollToCompare() {
    document.getElementById("neyora-compare")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openTrial() {
    if (!user) {
      window.location.href = loginPath;
      return;
    }
    setTrialModalOpen(true);
  }

  return (
    <div className="neyora-product bg-white text-slate-900 dark:bg-[#1C1814] dark:text-[#F3F4F6]">
      <section className={cn("border-b", neyoraSectionDivider)}>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[55fr_45fr] lg:items-center lg:py-20">
          <div>
            <span className="inline-flex rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800 dark:bg-[#352E28] dark:text-[#FCD34D]">
              {page.eyebrow}
            </span>
            <h1 className={cn("mt-4 text-4xl font-semibold leading-tight sm:text-5xl", neyoraHeading)}>
              {page.h1}
            </h1>
            <p className={cn("mt-4 max-w-xl text-base leading-8", neyoraMuted)}>{page.subhead}</p>
            <p className={cn("mt-2 max-w-xl text-base leading-8", neyoraMuted)}>{page.subheadLine2}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {settings.enabled ? (
                <Button type="button" className={cn(neyoraPrimaryBtn, "w-full sm:w-auto")} onClick={openTrial}>
                  {t(page.primaryCta, { days: String(days) })}
                </Button>
              ) : null}
              <Button type="button" variant="outline" className={neyoraSecondaryBtn} onClick={scrollToCompare}>
                {page.secondaryCta}
              </Button>
            </div>
            <p className={cn("mt-4 text-xs", neyoraMuted)} dir="ltr">
              {t(page.metaLine, { days: String(days) })}
            </p>
          </div>
          <div
            className="overflow-hidden rounded-2xl border border-[#3E362F] bg-[#1C1814] shadow-[0_0_80px_-20px_rgba(251,191,36,0.28)]"
            aria-label={page.previewLabel}
          >
            <Image
              src="/images/neyora-hero.jpg"
              alt={page.previewLabel}
              width={1280}
              height={720}
              className="h-auto w-full rounded-2xl object-cover"
              priority
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className={cn("text-2xl font-semibold", neyoraHeading)}>{page.instrumentsTitle}</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {page.instruments.map((item) => {
            const active = item.id === activeInstrument;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveInstrument(item.id)}
                className={cn(
                  neyoraCard,
                  "p-4 text-start transition-colors hover:border-slate-300 dark:hover:border-[#4A4037]",
                  active ? "border-[#FBBF24] ring-1 ring-[#FBBF24]/40" : "",
                )}
              >
                <p className={cn("text-sm font-semibold", neyoraAccent)}>
                  {locale === "ar" ? item.nameAr : item.name}
                </p>
                <p className={cn("mt-2 text-xs leading-6", neyoraMuted)}>{item.blurb}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className={cn("text-2xl font-semibold", neyoraHeading)}>{page.workflowTitle}</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {page.steps.map((step) => (
            <div key={step.number} className={cn(neyoraCard, "p-6")}>
              <p className={cn("text-xs font-semibold tracking-wide", neyoraAccent)}>
                {step.number} · {step.title}
              </p>
              <p className={cn("mt-3 text-sm leading-7", neyoraMuted)}>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={cn("text-2xl font-semibold", neyoraHeading)}>{page.studioShowcaseTitle}</h2>
          <p className={cn("mt-2 text-base leading-7", neyoraMuted)}>{page.studioShowcaseSubtitle}</p>
        </div>
        <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-2xl border border-[#3E362F] bg-[#14110E] shadow-[0_0_80px_-20px_rgba(251,191,36,0.2)]">
          <Image
            src="/images/neyora-app-ui.png"
            alt={page.studioShowcaseTitle}
            width={1280}
            height={784}
            className="h-auto w-full"
          />
        </div>
      </section>

      <section id="neyora-compare" className="mx-auto max-w-6xl px-4 pb-10">
        <h2 className={cn("text-center text-2xl font-semibold", neyoraHeading)}>{page.compareTitle}</h2>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          <div className={cn(neyoraCard, "border-t-4 border-t-[#FBBF24] p-6")}>
            <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-[#352E28] dark:text-[#FCD34D]">
              {page.trialCard.badge}
            </span>
            <h3 className={cn("mt-3 text-xl font-semibold", neyoraHeading)}>{page.trialCard.title}</h3>
            <p className={cn("mt-1 text-sm font-medium tabular-nums", neyoraAccent)}>
              {t(page.trialCard.duration, { days: String(days) })}
            </p>
            <ul className={cn("mt-4 space-y-2 text-sm", neyoraMuted)}>
              {page.trialCard.bullets.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
            {settings.enabled ? (
              <Button type="button" className={cn(neyoraPrimaryBtn, "mt-6 w-full")} onClick={openTrial}>
                {page.trialCard.cta}
              </Button>
            ) : null}
          </div>
          <div
            className={cn(
              neyoraCard,
              "border-t-4 border-t-[#D97706] p-6 dark:border-t-[#FF9F1C]",
            )}
          >
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-[#352E28] dark:text-[#FCD34D]">
              {page.fullCard.badge}
            </span>
            <h3 className={cn("mt-3 text-xl font-semibold", neyoraHeading)}>{page.fullCard.title}</h3>
            <ul className={cn("mt-4 space-y-2 text-sm", neyoraMuted)}>
              {page.fullCard.bullets.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
            <p className={cn("mt-4 text-sm leading-6", neyoraMuted)}>{page.fullCard.contactNote}</p>
            <LocaleLink href="/contact">
              <Button type="button" variant="outline" className={cn(neyoraFullLicenseBtn, "mt-4 w-full")}>
                {page.fullCard.cta}
              </Button>
            </LocaleLink>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-emerald-500/25 bg-emerald-50/80 p-6 dark:border-emerald-500/20 dark:bg-emerald-950/20">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-[#4ADE80]" aria-hidden />
            <div>
              <p className="font-semibold text-emerald-900 dark:text-[#4ADE80]">{page.optInTitle}</p>
              <p className={cn("mt-2 text-sm leading-7", neyoraMuted)}>{t(page.optInBody, { days: String(days) })}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pb-20 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className={cn("text-2xl font-semibold", neyoraHeading)}>{page.downloadTitle}</h2>
          <p className={cn("mt-2 text-sm", neyoraMuted)} dir="ltr">
            {t(page.metaLine, { days: String(days) })}
          </p>

          <div className={cn(neyoraCard, "mt-6 p-6")}>
            {publicRelease === undefined ? (
              <p className={cn("text-sm", neyoraMuted)}>{copy.auth.loading}</p>
            ) : publicRelease === null ? (
              <div>
                <p className={cn("text-lg font-semibold", neyoraHeading)}>{page.downloadCard.comingSoonTitle}</p>
                <p className={cn("mt-2 text-sm leading-7", neyoraMuted)}>{page.downloadCard.comingSoonBody}</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn("text-lg font-semibold tabular-nums", neyoraHeading)} dir="ltr">
                    {page.downloadCard.versionLabel} · v{publicRelease.version}
                  </p>
                  <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-[#352E28] dark:text-[#FCD34D]">
                    {publicRelease.channel === "stable"
                      ? page.downloadCard.channelStable
                      : page.downloadCard.channelBeta}
                  </span>
                  {publicRelease.mandatory ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
                      {page.downloadCard.mandatoryBadge}
                    </span>
                  ) : null}
                </div>

                {publicRelease.fileSize != null ? (
                  <p className={cn("text-sm tabular-nums", neyoraMuted)} dir="ltr">
                    {page.downloadCard.fileSizeLabel}: {formatReleaseFileSize(publicRelease.fileSize)}
                  </p>
                ) : null}

                {publicRelease.minOsVersion ? (
                  <p className={cn("text-sm tabular-nums", neyoraMuted)} dir="ltr">
                    {page.downloadCard.minOsLabel}: {publicRelease.minOsVersion}
                  </p>
                ) : null}

                <div className="space-y-2">
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", neyoraAccent)}>
                    {page.downloadCard.shaLabel}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 font-mono text-xs dark:border-[#4A4037] dark:bg-[#1C1814]/60" dir="ltr">
                    <span className="break-all text-slate-800 dark:text-[#E2E8F0]">{publicRelease.sha256}</span>
                    <CopyButton value={publicRelease.sha256} />
                  </div>
                </div>

                {publicRelease.releaseNotes ? (
                  <p className={cn("text-sm leading-7", neyoraMuted)}>{publicRelease.releaseNotes}</p>
                ) : null}

                {!user ? (
                  <div className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-[#3E362F]/50">
                    <p className={cn("text-sm", neyoraMuted)}>{page.downloadCard.signInHint}</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <Button type="button" className={cn(neyoraPrimaryBtn, "w-full sm:w-auto")} onClick={() => { window.location.href = loginPath; }}>
                        {page.downloadCard.signInCta}
                      </Button>
                      {settings.enabled ? (
                        <Button type="button" variant="outline" className={neyoraSecondaryBtn} onClick={openTrial}>
                          {page.downloadCard.trialCta}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : canDownload ? (
                  <a
                    className="inline-flex"
                    href={`/api/downloads/artifact?product=${encodeURIComponent(PRODUCT_CODES.neyoraPro)}&channel=${encodeURIComponent(publicRelease.channel)}&version=${encodeURIComponent(publicRelease.version)}`}
                  >
                    <Button type="button" className={cn(neyoraPrimaryBtn, "mt-2 w-full gap-2 sm:w-auto")}>
                      <Download className="h-4 w-4" aria-hidden />
                      {page.downloadCard.downloadCta}
                    </Button>
                  </a>
                ) : (
                  <div className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-[#3E362F]/50">
                    <p className={cn("text-sm", neyoraMuted)}>{page.downloadCard.noLicenseHint}</p>
                    {settings.enabled ? (
                      <Button type="button" className={cn(neyoraPrimaryBtn, "w-full sm:w-auto")} onClick={openTrial}>
                        {page.downloadCard.trialCta}
                      </Button>
                    ) : (
                      <LocaleLink href="/account">
                        <Button type="button" variant="outline" className={neyoraSecondaryBtn}>
                          {page.downloadCta}
                        </Button>
                      </LocaleLink>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className={cn(neyoraCard, "p-6 lg:col-span-5")}>
          <h3 className={cn("text-lg font-semibold", neyoraHeading)}>{page.requirementsTitle}</h3>
          <ul className={cn("mt-4 space-y-2 text-sm tabular-nums", neyoraMuted)}>
            {page.requirements.map((req) => (
              <li key={req}>{req}</li>
            ))}
          </ul>
        </div>
      </section>

      {trialModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            className={cn(
              neyoraCard,
              "max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 text-slate-900 shadow-xl dark:text-[#F3F4F6]",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className={cn("text-lg font-semibold", neyoraHeading)}>{copy.auth.trialActivateTitle}</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-700 shadow-none hover:bg-slate-100 dark:bg-transparent dark:text-[#CBD5E1] dark:hover:bg-[#352E28]"
                onClick={() => setTrialModalOpen(false)}
              >
                {copy.auth.licensesDeactivateCancel}
              </Button>
            </div>
            <TrialActivatePanel
              className="mt-4"
              durationDays={days}
              showConsent
              neyoraTheme
              isLoggedIn={Boolean(user)}
              loginNextPath={localizeHref("/products/neyora", locale)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}