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
          <a className="font-semibold text-primary hover:underline" href={`mailto:${siteConfig.supportEmail}`}>
            {siteConfig.supportEmail}
          </a>
        </p>
        <p className="mt-2 text-muted-foreground">{page.note}</p>
      </div>
      <h2 className="text-xl font-bold">{page.heading}</h2>
      <ContactForm />
    </LegalPage>
  );
}

function PolicyList({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-2 ps-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function PrivacyView({ isPlaceholder = false }: { isPlaceholder?: boolean }) {
  const { copy, locale } = useI18n();
  const page = copy.privacy;
  const effectiveDate = new Date().toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB");
  const privacyEmail = page.privacyEmail;

  if (isPlaceholder) {
    const sections = [
      { title: page.introTitle, body: page.placeholderBody },
      { title: page.collectTitle, body: page.placeholderBody },
      { title: page.useTitle, body: page.placeholderBody },
      { title: page.shareTitle, body: page.placeholderBody },
      { title: page.rightsTitle, body: page.placeholderBody },
      { title: page.securityTitle, body: page.placeholderBody },
      { title: page.contactTitle, body: page.placeholderBody },
    ] as const;

    return (
      <LegalPage title={page.title} updatedAt={`${page.effectiveDateLabel}: ${effectiveDate}`}>
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
    <LegalPage title={page.title} updatedAt={`${page.effectiveDateLabel}: ${effectiveDate}`}>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">{page.introTitle}</h2>
        {page.intro.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{page.collectTitle}</h2>
        <p>{page.collectLead}</p>
        <h3 className="text-base font-semibold sm:text-lg">{page.collectYouTitle}</h3>
        <PolicyList items={page.collectYou} />
        <h3 className="text-base font-semibold sm:text-lg">{page.collectAutoTitle}</h3>
        <PolicyList items={page.collectAuto} />
        <h3 className="text-base font-semibold sm:text-lg">{page.collectNotTitle}</h3>
        <p>{page.collectNot}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{page.useTitle}</h2>
        <PolicyList items={page.use} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{page.legalTitle}</h2>
        <p>{page.legalLead}</p>
        <PolicyList items={page.legal} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{page.shareTitle}</h2>
        <p>{page.shareLead}</p>
        <PolicyList items={page.share} />
        <p>{page.shareNot}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{page.retentionTitle}</h2>
        <PolicyList items={page.retention} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{page.rightsTitle}</h2>
        <p>{page.rightsLead}</p>
        <PolicyList items={page.rights} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{page.securityTitle}</h2>
        <PolicyList items={page.security} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{page.cookiesTitle}</h2>
        <p>{page.cookiesLead}</p>
        <PolicyList items={page.cookies} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{page.childrenTitle}</h2>
        <p>{page.children}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{page.marketingTitle}</h2>
        <PolicyList items={page.marketing} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{page.changesTitle}</h2>
        <p>{page.changes}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{page.contactTitle}</h2>
        <p>
          {page.contact}{" "}
          <a className="font-semibold text-primary hover:underline" href={`mailto:${privacyEmail}`}>
            {privacyEmail}
          </a>
          .{" "}
          <Link href="/contact" className="font-semibold text-primary hover:underline">
            {page.contactPage}
          </Link>
          .
        </p>
      </section>
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
