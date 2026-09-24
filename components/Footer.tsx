"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/components/i18n/I18nProvider";
import { products } from "@/lib/products";
import { siteConfig } from "@/lib/site";
import { footerCompanyItems, footerExploreItems, qv1Path } from "@/lib/site-nav";

export function Footer() {
  const pathname = usePathname();
  const { copy } = useI18n();
  const year = new Date().getFullYear();
  if (pathname === "/studio") return null;

  const productLinks = [
    { href: products.studio.href, label: copy.products.studio.name },
    { href: qv1Path, label: copy.qv1Page.shortName },
    { href: products.qv1.href, label: copy.products.qv1.name },
    { href: products.neyora.href, label: copy.products.neyora.name },
  ];

  const exploreLinks = footerExploreItems.map((item) => ({
    href: item.href,
    label: item.source === "footer" ? copy.footer[item.labelKey] : copy.nav[item.labelKey],
  }));

  const legalLinks = footerCompanyItems.map((item) => ({
    href: item.href,
    label: copy.footer[item.labelKey],
  }));

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
