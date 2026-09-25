"use client";

import { LocaleLink as Link } from "@/components/LocaleLink";
import { ArrowRight, Mail } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { qv1Path } from "@/lib/site-nav";

export function HomeClosingCta() {
  const { copy } = useI18n();

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <div className="qvi-card glow-cyan rounded-3xl border bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8 sm:p-10">
          <p className="qvi-kicker text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {copy.home.closingKicker}
          </p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{copy.home.closingTitle}</h2>
          <p className="qvi-lead mt-3 max-w-2xl text-muted-foreground">{copy.home.closingLead}</p>
          <div className="qvi-actions mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="qvi-btn">
              <Link href={qv1Path}>
                {copy.home.qv1Cta}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="qvi-btn qvi-btn-outline">
              <Link href="/products/neyora">{copy.home.neyoraCta}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="qvi-btn qvi-btn-outline">
              <Link href="/contact">
                <Mail />
                {copy.home.closingContact}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
