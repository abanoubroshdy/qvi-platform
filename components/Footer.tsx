"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/components/i18n/I18nProvider";
import { siteConfig } from "@/lib/site";

export function Footer() {
  const { copy } = useI18n();
  const year = new Date().getFullYear();

  const productLinks = [
    { href: "/products/qv1", label: copy.products.qv1.name },
    { href: "/products/neyora", label: `${copy.products.neyora.name}` },
  ];

  const exploreLinks = [
    { href: "/", label: copy.footer.home },
    { href: "/#products", label: copy.nav.products },
    { href: "/#tools", label: copy.footer.freeTools },
    { href: "/lab", label: copy.nav.lab },
    { href: "/#explore", label: copy.footer.siteMap },
  ];

  const legalLinks = [
    { href: "/about", label: copy.footer.about },
    { href: "/privacy-policy", label: copy.footer.privacy },
    { href: "/contact", label: copy.footer.contact },
    { href: "/terms", label: copy.footer.terms },
  ];

  return (
    <footer className="qvi-footer mt-auto border-t border-border bg-muted/40">
      <div className="qvi-footer-inner mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-3 sm:col-span-2 lg:col-span-2">
          <Logo />
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            {siteConfig.fullName}. {copy.home.kicker}. {copy.footer.blurb}
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-foreground">{copy.footer.explore}</h2>
          <ul className="space-y-2 text-sm">
            {exploreLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-muted-foreground transition hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-foreground">{copy.footer.products}</h2>
          <ul className="space-y-2 text-sm">
            {productLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-muted-foreground transition hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/tools" className="text-muted-foreground transition hover:text-primary">
                {copy.footer.freeTools}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-foreground">{copy.footer.company}</h2>
          <ul className="space-y-2 text-sm">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-muted-foreground transition hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground sm:text-start">
          © {year} {siteConfig.fullName}. {copy.footer.rights}
        </p>
      </div>
    </footer>
  );
}
