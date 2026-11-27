"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { LocaleLink } from "@/components/LocaleLink";
import { TrialActivatePanel } from "@/components/licensing/TrialActivatePanel";
import { usePublicTrialSettings } from "@/components/neyora/usePublicTrialSettings";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { localizeHref } from "@/lib/i18n/locale-path";
import { cn } from "@/lib/utils";

export function NeyoraView() {
  const { copy, locale, t } = useI18n();
  const page = copy.products.neyora;
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const { user } = useAuth();
  const { settings } = usePublicTrialSettings();
  const days = settings.duration_days;
  const [activeInstrument, setActiveInstrument] = useState(page.instruments[0]?.id ?? "ney");
  const [trialModalOpen, setTrialModalOpen] = useState(false);

  const surface = isDark ? "bg-[#1C1814]" : "bg-white";
  const card = isDark ? "bg-[#2A2420] border-[#3E362F]" : "bg-card border-border";
  const textPrimary = isDark ? "text-[#F3F4F6]" : "text-foreground";
  const textMuted = isDark ? "text-[#CBD5E1]" : "text-muted-foreground";
  const accentText = isDark ? "text-[#FBBF24]" : "text-amber-700";

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
    <div className={cn("neyora-product", surface, textPrimary)}>
      <section className="border-b border-border/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[55fr_45fr] lg:items-center lg:py-20">
          <div>
            <span
              className={cn(
                "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
                isDark ? "bg-[#2A2420] text-[#FBBF24]" : "bg-[#FEF3C7] text-amber-700",
              )}
            >
              {page.eyebrow}
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">{page.h1}</h1>
            <p className={cn("mt-4 max-w-xl text-base leading-8", textMuted)}>{page.subhead}</p>
            <p className={cn("mt-2 max-w-xl text-base leading-8", textMuted)}>{page.subheadLine2}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {settings.enabled ? (
                <Button
                  type="button"
                  className="min-h-[48px] w-full bg-[#FBBF24] font-bold text-[#1C1814] hover:bg-[#FCD34D] sm:w-auto"
                  onClick={openTrial}
                >
                  {t(page.primaryCta, { days: String(days) })}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="min-h-[48px] w-full border-[#3E362F] sm:w-auto"
                onClick={scrollToCompare}
              >
                {page.secondaryCta}
              </Button>
            </div>
            <p className={cn("mt-4 text-xs", textMuted)} dir="ltr">
              {t(page.metaLine, { days: String(days) })}
            </p>
          </div>
          <div
            className="relative overflow-hidden rounded-2xl border border-[#3E362F] bg-[#1C1814] p-6 shadow-[0_0_80px_-20px_rgba(251,191,36,0.25)]"
            aria-label={page.previewLabel}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#94A3B8]">{page.previewLabel}</p>
            <div className="mt-6 rounded-xl border border-[#3E362F] bg-[#2A2420] p-4">
              <svg
                viewBox="0 0 400 80"
                className="h-24 w-full text-[#FBBF24]"
                role="img"
                aria-hidden
              >
                <path
                  fill="currentColor"
                  d="M0 40 Q20 10 40 40 T80 40 T120 40 T160 40 T200 40 T240 40 T280 40 T320 40 T360 40 T400 40 V80 H0 Z"
                  opacity="0.35"
                />
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  d="M0 40 Q25 8 50 42 T100 38 T150 44 T200 36 T250 42 T300 38 T350 40 T400 38"
                />
              </svg>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] text-[#CBD5E1]">
                <span>Maqam</span>
                <span>Feeling</span>
                <span>Tempo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold">{page.instrumentsTitle}</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {page.instruments.map((item) => {
            const active = item.id === activeInstrument;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveInstrument(item.id)}
                className={cn(
                  "rounded-2xl border p-4 text-start transition-colors",
                  card,
                  active ? "border-[#FBBF24] ring-1 ring-[#FBBF24]/40" : "",
                )}
              >
                <p className={cn("text-sm font-semibold", accentText)}>
                  {locale === "ar" ? item.nameAr : item.name}
                </p>
                <p className={cn("mt-2 text-xs leading-6", textMuted)}>{item.blurb}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="text-2xl font-semibold">{page.workflowTitle}</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {page.steps.map((step) => (
            <div key={step.number} className={cn("rounded-2xl border p-6", card)}>
              <p className={cn("text-xs font-semibold tracking-wide", accentText)}>
                {step.number} · {step.title}
              </p>
              <p className={cn("mt-3 text-sm leading-7", textMuted)}>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="neyora-compare" className="mx-auto max-w-6xl px-4 pb-10">
        <h2 className="text-center text-2xl font-semibold">{page.compareTitle}</h2>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          <div className={cn("rounded-2xl border border-t-4 border-t-[#FBBF24] p-6", card)}>
            <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-[#2A2420] dark:text-[#FBBF24]">
              {page.trialCard.badge}
            </span>
            <h3 className="mt-3 text-xl font-semibold">{page.trialCard.title}</h3>
            <p className={cn("mt-1 text-sm font-medium tabular-nums", accentText)}>
              {t(page.trialCard.duration, { days: String(days) })}
            </p>
            <ul className={cn("mt-4 space-y-2 text-sm", textMuted)}>
              {page.trialCard.bullets.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
            {settings.enabled ? (
              <Button
                type="button"
                className="mt-6 min-h-[48px] w-full bg-[#FBBF24] font-bold text-[#1C1814] hover:bg-[#FCD34D]"
                onClick={openTrial}
              >
                {page.trialCard.cta}
              </Button>
            ) : null}
          </div>
          <div className={cn("rounded-2xl border border-t-4 border-t-[#4338CA] p-6", card)}>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {page.fullCard.badge}
            </span>
            <h3 className="mt-3 text-xl font-semibold">{page.fullCard.title}</h3>
            <ul className={cn("mt-4 space-y-2 text-sm", textMuted)}>
              {page.fullCard.bullets.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
            <LocaleLink href="/contact">
              <Button type="button" variant="outline" className="mt-6 min-h-[48px] w-full">
                {page.fullCard.cta}
              </Button>
            </LocaleLink>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-[#4ADE80]" aria-hidden />
            <div>
              <p className="font-semibold text-emerald-800 dark:text-[#4ADE80]">{page.optInTitle}</p>
              <p className={cn("mt-2 text-sm leading-7", textMuted)}>
                {t(page.optInBody, { days: String(days) })}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pb-20 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="text-2xl font-semibold">{page.downloadTitle}</h2>
          <p className={cn("mt-2 text-sm", textMuted)} dir="ltr">
            {t(page.metaLine, { days: String(days) })}
          </p>
          <LocaleLink href="/account">
            <Button type="button" className="mt-6 min-h-[48px] w-full bg-[#FBBF24] font-bold text-[#1C1814] hover:bg-[#FCD34D] sm:w-auto">
              {page.downloadCta}
            </Button>
          </LocaleLink>
        </div>
        <div className={cn("rounded-2xl border p-6 lg:col-span-5", card)}>
          <h3 className="text-lg font-semibold">{page.requirementsTitle}</h3>
          <ul className={cn("mt-4 space-y-2 text-sm tabular-nums", textMuted)}>
            {page.requirements.map((req) => (
              <li key={req}>{req}</li>
            ))}
          </ul>
        </div>
      </section>

      {trialModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className={cn("max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-xl", card)}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">{copy.auth.trialActivateTitle}</h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setTrialModalOpen(false)}>
                {copy.auth.licensesDeactivateCancel}
              </Button>
            </div>
            <TrialActivatePanel
              className="mt-4"
              durationDays={days}
              showConsent
              isLoggedIn={Boolean(user)}
              loginNextPath={localizeHref("/products/neyora", locale)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}