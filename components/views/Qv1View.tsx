"use client";

import Link from "next/link";
import { AudioLines, Mic2, Music2, Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { qv1Path } from "@/lib/site-nav";

const featureIcons = [Mic2, Sparkles, Music2];

export function Qv1View() {
  const { copy } = useI18n();
  const page = copy.products.qv1;

  return (
    <div>
      <section className="hero-grid border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            <AudioLines className="h-4 w-4" />
            {page.kicker}
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">{page.h1}</h1>
          <p className="mt-3 text-xl text-muted-foreground">{page.title}</p>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
            {page.description} {page.extra}
          </p>
          <Button asChild size="lg" className="qvi-btn mt-6">
            <Link href={qv1Path}>{page.evaluationCta}</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-3">
        {page.cards.map((feature, index) => {
          const Icon = featureIcons[index] ?? Sparkles;
          return (
            <div key={feature.title} className="rounded-2xl border border-border bg-card p-6 glow-cyan">
              <Icon className="mb-4 h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{feature.text}</p>
            </div>
          );
        })}
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-12">
        <h2 className="mb-4 text-2xl font-semibold">{page.specsTitle}</h2>
        <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {page.specs.map(([label, value]) => (
            <div key={label} className="grid gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-6">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium sm:col-span-2">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <h2 className="mb-4 text-2xl font-semibold">{copy.common.faq}</h2>
        <div className="rounded-2xl border border-border bg-card px-4">
          {page.faqs.map((faq) => (
            <details key={faq.q} className="border-b border-border last:border-b-0">
              <summary className="cursor-pointer py-4 text-base font-medium">{faq.q}</summary>
              <p className="pb-4 leading-7 text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
