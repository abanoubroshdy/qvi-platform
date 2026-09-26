"use client";

import { LocaleLink as Link } from "@/components/LocaleLink";
import { JsonLd } from "@/components/JsonLd";
import { CopyHashButton } from "@/components/qv1/CopyHashButton";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { qv1Changelog } from "@/lib/qv1-changelog";
import { formatBytes } from "@/lib/format";
import { QV1_DOWNLOAD_ENABLED } from "@/lib/qv1-download";
import { qv1DownloadSummary, qv1HasSha256, qv1Release, type Qv1DownloadNotice } from "@/lib/qv1-release";
import { withLocale } from "@/lib/i18n/locale-path";
import { siteConfig } from "@/lib/site";

function formatReleaseDate(iso: string, locale: "en" | "ar") {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function Qv1EvaluationView({ notice }: { notice: Qv1DownloadNotice }) {
  const { copy, locale } = useI18n();
  const page = copy.qv1Page;
  const summary = qv1DownloadSummary(qv1Release, formatBytes);
  const showHash = qv1HasSha256(qv1Release);
  const releaseNotesExternal = /^https?:\/\//i.test(qv1Release.releaseNotesUrl);
  const effectiveNotice = QV1_DOWNLOAD_ENABLED ? notice : "paused";
  const status =
    effectiveNotice === "paused"
      ? page.paused
      : effectiveNotice === "soon"
        ? page.comingSoon
        : effectiveNotice === "limited"
          ? page.limited
          : effectiveNotice === "unavailable"
            ? page.unavailable
            : null;

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "QV1 Evaluation",
          applicationCategory: "MultimediaApplication",
          operatingSystem: qv1Release.minOs,
          softwareVersion: qv1Release.version,
          inLanguage: locale,
          url: `${siteConfig.url}${withLocale("/qv1", locale)}`,
          description: page.metaDescription,
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          ...(QV1_DOWNLOAD_ENABLED ? { downloadUrl: `${siteConfig.url}/qv1/download` } : {}),
        }}
      />

      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{page.kicker}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{page.title}</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">{page.lead}</p>

          <article className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {page.chip}
            </p>

            {status ? (
              <p
                id="qv1-download-status"
                className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm leading-6 text-foreground"
                role="alert"
              >
                {status}
              </p>
            ) : null}

            <div className="mt-5">
              {QV1_DOWNLOAD_ENABLED ? (
                <Button asChild size="lg" className="h-12 w-full bg-primary text-base text-primary-foreground">
                  <a href="/qv1/download" aria-describedby={status ? "qv1-download-status" : undefined}>
                    {page.download}
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full bg-primary text-base text-primary-foreground"
                  disabled
                  aria-describedby="qv1-download-status"
                >
                  {page.download}
                </Button>
              )}
            </div>

            <p className="mt-3 text-center text-sm text-muted-foreground">{summary}</p>
            {qv1Release.fileName ? (
              <p className="mt-1 text-center font-mono text-xs text-muted-foreground">{qv1Release.fileName}</p>
            ) : null}
            {QV1_DOWNLOAD_ENABLED ? (
              <p className="mt-3 text-center text-sm leading-6 text-muted-foreground">{page.signInHint}</p>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{page.setupNote}</p>

            {showHash ? (
              <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {page.shaLabel}
                  </p>
                  <CopyHashButton
                    value={qv1Release.sha256.trim()}
                    copyLabel={copy.common.copy}
                    copiedLabel={copy.common.copied}
                  />
                </div>
                <p className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-5 text-foreground">
                  {qv1Release.sha256.trim()}
                </p>
              </div>
            ) : null}

            {qv1Release.codeSigned ? null : (
              <div className="mt-6 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
                {/* A screenshot of the Windows "Unknown publisher" dialog can be placed here. */}
                <p>{page.unsigned}</p>
              </div>
            )}
          </article>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {releaseNotesExternal ? (
              <a className="font-medium text-foreground underline-offset-4 hover:underline" href={qv1Release.releaseNotesUrl}>
                {page.releaseNotes}
              </a>
            ) : (
              <Link className="font-medium text-foreground underline-offset-4 hover:underline" href={qv1Release.releaseNotesUrl}>
                {page.releaseNotes}
              </Link>
            )}
            <span aria-hidden="true"> · </span>
            <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/qv1/models">
              {page.modelSources}
            </Link>
            <span aria-hidden="true"> · </span>
            <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/privacy-policy">
              {page.privacy}
            </Link>
            <span aria-hidden="true"> · </span>
            <a className="font-medium text-foreground underline-offset-4 hover:underline" href={`mailto:${siteConfig.supportEmail}`}>
              {siteConfig.supportEmail}
            </a>
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-14 sm:py-16 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold leading-snug">{page.stemsTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{page.stemsLead}</p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm font-medium">
            {page.stems.map((stem) => (
              <li key={stem} className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                {stem}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{page.stemsNote}</p>
        </article>

        <article className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold leading-snug">{page.proTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{page.proLead}</p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm font-medium">
            {page.proItems.map((item) => (
              <li key={item} className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{page.proAlso}</p>
        </article>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-14">
        <h2 className="text-2xl font-semibold">{page.requirementsTitle}</h2>
        <dl className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border">
          <div className="grid gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-6">
            <dt className="text-sm text-muted-foreground">{page.requirementOs}</dt>
            <dd className="text-sm font-medium sm:col-span-2">{qv1Release.minOs}</dd>
          </div>
          <div className="grid gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-6">
            <dt className="text-sm text-muted-foreground">{page.requirementGpu}</dt>
            <dd className="text-sm font-medium sm:col-span-2">{page.requirementGpuValue}</dd>
          </div>
          <div className="grid gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-6">
            <dt className="text-sm text-muted-foreground">{page.requirementCpu}</dt>
            <dd className="text-sm font-medium sm:col-span-2">{page.requirementCpuValue}</dd>
          </div>
        </dl>
      </section>

      <section id="release-notes" className="mx-auto max-w-3xl scroll-mt-24 px-4 pb-16">
        <h2 className="text-2xl font-semibold">{page.changelogTitle}</h2>
        <ol className="mt-4 space-y-4">
          {qv1Changelog.map((entry) => (
            <li key={entry.version} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold">
                  {page.versionLabel} {entry.version}
                </h3>
                <time className="text-sm text-muted-foreground" dateTime={entry.date}>
                  {formatReleaseDate(entry.date, locale)}
                </time>
              </div>
              <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-7 text-muted-foreground">
                {entry.notes[locale].map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
