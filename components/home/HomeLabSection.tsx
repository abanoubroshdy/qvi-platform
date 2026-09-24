"use client";

import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function HomeLabSection() {
  const { copy } = useI18n();
  const neyora = copy.products.neyora;

  return (
    <section id="lab" className="border-b border-border bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-16 lg:grid-cols-[1fr_minmax(0,1.1fr)] lg:items-center">
        <div>
          <p className="qvi-kicker text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {copy.home.labSectionKicker}
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{neyora.kicker}</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{neyora.title}</h2>
          <p className="qvi-lead mt-4 text-muted-foreground">{neyora.description}</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{neyora.extra}</p>
          <ul className="mt-5 space-y-2 text-sm text-foreground">
            {neyora.features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
          <div className="qvi-actions mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="qvi-btn">
              <Link href="/lab">
                {copy.common.exploreLab}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="qvi-btn qvi-btn-outline">
              <Link href="/products/neyora">{copy.home.labProductCta}</Link>
            </Button>
          </div>
        </div>

        <div className="qvi-card glow-violet relative overflow-hidden rounded-3xl border p-8 shadow-sm">
          <div className="pointer-events-none absolute -end-8 -top-8 h-40 w-40 rounded-full bg-accent/15 blur-2xl" aria-hidden />
          <div className="relative flex flex-col gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <FlaskConical className="h-7 w-7" aria-hidden />
            </span>
            <Badge className="w-fit bg-accent text-accent-foreground">{neyora.status}</Badge>
            <p className="text-lg font-semibold">{neyora.name}</p>
            <p className="text-sm leading-7 text-muted-foreground">{neyora.ddspBody}</p>
            <Link
              href="/lab"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              {copy.common.exploreLab}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
