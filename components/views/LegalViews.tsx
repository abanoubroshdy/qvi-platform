"use client";

import Link from "next/link";
import { ContactForm } from "@/components/contact/ContactForm";
import { LegalPage } from "@/components/LegalPage";
import { useI18n } from "@/components/i18n/I18nProvider";
import { siteConfig } from "@/lib/site";

export function AboutView() {
  const { copy, t } = useI18n();
  const page = copy.about;

  return (
    <LegalPage title={page.title} updatedAt={t(copy.common.lastUpdated, { date: page.updated })}>
      <p>{page.p1}</p>
      <h2 className="text-xl font-bold">{page.h2ecosystem}</h2>
      <p>
        <Link href="/products/qv1" className="font-semibold text-primary hover:underline">
          QV1
        </Link>{" "}
        ·{" "}
        <Link href="/products/neyora" className="font-semibold text-primary hover:underline">
          Neyora
        </Link>
        . {page.p2a}
      </p>
      <h2 className="text-xl font-bold">{page.h2device}</h2>
      <p>{page.p3}</p>
      <h2 className="text-xl font-bold">{page.h2ads}</h2>
      <p>
        {page.p4}{" "}
        <Link href="/privacy-policy" className="font-semibold text-primary hover:underline">
          {copy.footer.privacy}
        </Link>
        .
      </p>
      <h2 className="text-xl font-bold">{page.h2contact}</h2>
      <p>
        {t(page.p5, { email: siteConfig.email })}{" "}
        <Link href="/contact" className="font-semibold text-primary hover:underline">
          {copy.footer.contact}
        </Link>
        .
      </p>
    </LegalPage>
  );
}

export function ContactView() {
  const { copy, t } = useI18n();
  const page = copy.contact;

  return (
    <LegalPage title={page.title} updatedAt={t(copy.common.lastUpdated, { date: page.updated })}>
      <p>{page.p1}</p>
      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <p>
          {page.emailLabel}{" "}
          <a className="font-semibold text-primary hover:underline" href={`mailto:${siteConfig.email}`}>
            {siteConfig.email}
          </a>
        </p>
        <p className="mt-2 text-muted-foreground">{page.note}</p>
      </div>
      <h2 className="text-xl font-bold">{page.heading}</h2>
      <ContactForm />
    </LegalPage>
  );
}

export function PrivacyView() {
  const { copy, t } = useI18n();
  const page = copy.privacy;
  const isContentReady = false;
  const sections = [
    { title: page.introTitle, body: page.placeholderBody },
    { title: page.collectTitle, body: page.placeholderBody },
    { title: page.useTitle, body: page.placeholderBody },
    { title: page.shareTitle, body: page.placeholderBody },
    { title: page.rightsTitle, body: page.placeholderBody },
    { title: page.securityTitle, body: page.placeholderBody },
    { title: page.contactTitle, body: page.placeholderBody },
  ] as const;

  if (!isContentReady) {
    return (
      <LegalPage title={page.title} updatedAt={t(copy.common.lastUpdated, { date: page.updated })}>
        <p
          className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground"
          role="status"
        >
          {page.comingSoon}
        </p>
        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-xl font-bold">{section.title}</h2>
            <p className="text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </LegalPage>
    );
  }

  return (
    <LegalPage title={page.title} updatedAt={t(copy.common.lastUpdated, { date: page.updated })}>
      <p>{page.p1}</p>
      <h2 className="text-xl font-bold">{page.h1}</h2>
      <p>{page.p2}</p>
      <p>{page.p3}</p>
      <h2 className="text-xl font-bold">{page.h2}</h2>
      <p>{page.p4}</p>
      <h2 className="text-xl font-bold">{page.h3}</h2>
      <p>{page.p5}</p>
      <ul className="list-disc space-y-2 ps-5">
        <li>
          Google:{" "}
          <a className="text-primary hover:underline" href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">
            adssettings.google.com
          </a>
        </li>
        <li>
          <a
            className="text-primary hover:underline"
            href="https://policies.google.com/technologies/ads"
            rel="noopener noreferrer"
            target="_blank"
          >
            policies.google.com/technologies/ads
          </a>
        </li>
      </ul>
      <h2 className="text-xl font-bold">{page.h4}</h2>
      <p>{t(page.p6, { email: siteConfig.email })}</p>
      <h2 className="text-xl font-bold">{page.h5}</h2>
      <p>{page.p7}</p>
      <h2 className="text-xl font-bold">{page.h6}</h2>
      <p>{page.p8}</p>
      <h2 className="text-xl font-bold">{page.h7}</h2>
      <p>
        {t(page.p9, { email: siteConfig.email })}{" "}
        <Link href="/contact" className="font-semibold text-primary hover:underline">
          {copy.footer.contact}
        </Link>
        .
      </p>
    </LegalPage>
  );
}

export function TermsView() {
  const { copy, t } = useI18n();
  const page = copy.terms;

  return (
    <LegalPage title={page.title} updatedAt={t(copy.common.lastUpdated, { date: page.updated })}>
      <p>
        {page.p1}{" "}
        <Link href="/privacy-policy" className="font-semibold text-primary hover:underline">
          {copy.footer.privacy}
        </Link>
        .
      </p>
      <h2 className="text-xl font-bold">{page.h1}</h2>
      <p>{page.p2}</p>
      <h2 className="text-xl font-bold">{page.h2}</h2>
      <p>{page.p3}</p>
      <h2 className="text-xl font-bold">{page.h3}</h2>
      <ul className="list-disc space-y-2 ps-5">
        <li>{page.l1}</li>
        <li>{page.l2}</li>
        <li>{page.l3}</li>
      </ul>
      <h2 className="text-xl font-bold">{page.h4}</h2>
      <p>{page.p4}</p>
      <h2 className="text-xl font-bold">{page.h5}</h2>
      <p>{page.p5}</p>
      <h2 className="text-xl font-bold">{page.h6}</h2>
      <p>{page.p6}</p>
      <h2 className="text-xl font-bold">{page.h7}</h2>
      <p>
        {t(page.p7, { email: siteConfig.email })}{" "}
        <Link href="/contact" className="font-semibold text-primary hover:underline">
          {copy.footer.contact}
        </Link>
        .
      </p>
    </LegalPage>
  );
}
