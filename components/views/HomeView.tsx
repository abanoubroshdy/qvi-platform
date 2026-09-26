"use client";

import { LocaleLink as Link } from "@/components/LocaleLink";
import { ArrowRight } from "lucide-react";
import { HomeClosingCta } from "@/components/home/HomeClosingCta";
import { HomeLabSection } from "@/components/home/HomeLabSection";
import { HomeSiteExplore } from "@/components/home/HomeSiteExplore";
import { HomeToolsCategories } from "@/components/home/HomeToolsCategories";
import { ProductSpotlight } from "@/components/ProductSpotlight";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { products } from "@/lib/products";
import { qv1Path } from "@/lib/site-nav";

export function HomeView() {
  const { copy } = useI18n();

  return (
    <div>
      <section className="qvi-hero hero-grid border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 lg:py-24">
          <p className="qvi-kicker mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            {copy.home.kicker}
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">{copy.home.title}</h1>
          <p className="qvi-lead mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">{copy.home.lead}</p>
          <div className="qvi-actions mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="qvi-btn">
              <Link href={qv1Path}>
                {copy.home.qv1Cta}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="qvi-btn qvi-btn-outline">
              <Link href={products.neyora.href}>{copy.home.neyoraCta}</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {copy.home.toolsAside}{" "}
            <Link href="/tools" className="font-semibold text-primary underline-offset-4 hover:underline">
              {copy.home.tryTools}
            </Link>
          </p>
        </div>
      </section>

      <section id="products" className="qvi-section mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <div className="mb-8 max-w-2xl">
          <p className="qvi-kicker text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {copy.home.productsKicker}
          </p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{copy.home.productsTitle}</h2>
          <p className="qvi-lead mt-3 text-muted-foreground">{copy.home.productsLead}</p>
        </div>
        <div className="qvi-product-grid grid gap-6 lg:grid-cols-2">
          <ProductSpotlight
            name={copy.products.qv1.name}
            title={copy.products.qv1.title}
            description={copy.products.qv1.description}
            status={copy.products.qv1.status}
            features={[...copy.products.qv1.features]}
            href={qv1Path}
            cta={copy.home.qv1Cta}
            tone="violet"
          />
          <ProductSpotlight
            name={copy.products.neyora.name}
            title={copy.products.neyora.title}
            description={copy.products.neyora.description}
            status={copy.products.neyora.status}
            features={[...copy.products.neyora.features]}
            href={products.neyora.href}
            cta={copy.home.neyoraCta}
            tone="cyan"
          />
        </div>
        <p className="mt-8 max-w-3xl text-sm leading-7 text-muted-foreground">
          {copy.home.extrasNote}{" "}
          <Link href={products.studio.href} className="font-semibold text-primary underline-offset-4 hover:underline">
            {copy.products.studio.name}
          </Link>
          {" · "}
          <Link href="/tools" className="font-semibold text-primary underline-offset-4 hover:underline">
            {copy.home.tryTools}
          </Link>
        </p>
      </section>

      <HomeLabSection />
      <HomeToolsCategories />
      <HomeSiteExplore />
      <HomeClosingCta />
    </div>
  );
}
