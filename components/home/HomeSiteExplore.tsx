"use client";

import Link from "next/link";
import {
  BookOpen,
  FlaskConical,
  Hammer,
  LogIn,
  Mail,
  Music2,
  Scale,
  Shield,
  Sparkles,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { products } from "@/lib/products";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { qv1Path } from "@/lib/site-nav";
import { cn } from "@/lib/utils";

type ExploreLink = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export function HomeSiteExplore() {
  const { copy } = useI18n();

  const links: ExploreLink[] = [
    {
      href: qv1Path,
      label: copy.qv1Page.shortName,
      description: copy.qv1Page.lead,
      icon: Music2,
    },
    {
      href: "/products/neyora",
      label: copy.products.neyora.name,
      description: copy.products.neyora.title,
      icon: Sparkles,
    },
    {
      href: products.studio.href,
      label: copy.products.studio.name,
      description: copy.products.studio.title,
      icon: SlidersHorizontal,
    },
    {
      href: "/lab",
      label: copy.nav.lab,
      description: copy.products.neyora.kicker,
      icon: FlaskConical,
    },
    {
      href: "/tools",
      label: copy.nav.tools,
      description: copy.home.toolsSectionLead,
      icon: Wrench,
    },
    {
      href: "/login",
      label: copy.nav.signIn,
      description: copy.auth.signInLead,
      icon: LogIn,
    },
    {
      href: "/about",
      label: copy.footer.about,
      description: copy.about.p1,
      icon: BookOpen,
    },
    {
      href: "/contact",
      label: copy.footer.contact,
      description: copy.contact.note,
      icon: Mail,
    },
    {
      href: "/privacy-policy",
      label: copy.footer.privacy,
      description: copy.privacy.title,
      icon: Shield,
    },
    {
      href: "/terms",
      label: copy.footer.terms,
      description: copy.terms.title,
      icon: Scale,
    },
  ];

  return (
    <section id="explore" className="qvi-section bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <div className="mb-8 max-w-2xl">
          <p className="qvi-kicker text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {copy.home.exploreKicker}
          </p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{copy.home.exploreTitle}</h2>
          <p className="qvi-lead mt-3 text-muted-foreground">{copy.home.exploreLead}</p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(({ href, label, description, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "qvi-card group flex h-full gap-4 rounded-2xl border bg-card p-5 shadow-sm transition",
                  "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                )}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground group-hover:text-primary">{label}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground line-clamp-2">
                    {description}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Hammer className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          {copy.home.toolsLead}
        </p>
      </div>
    </section>
  );
}
