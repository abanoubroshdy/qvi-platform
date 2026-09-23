"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeClosingCta } from "@/components/home/HomeClosingCta";
import { HomeLabSection } from "@/components/home/HomeLabSection";
import { HomeSiteExplore } from "@/components/home/HomeSiteExplore";
import { HomeToolsCategories } from "@/components/home/HomeToolsCategories";
import { ProductSpotlight } from "@/components/ProductSpotlight";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { toolCategoryOrder } from "@/lib/tools";

export function HomeView() {
  const { copy } = useI18n();

  return (
    <div>
      <section className="qvi-hero hero-grid border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 lg:py-24">
          <p className="qvi-kicker mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            {copy.home.kicker}
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            {copy.home.title}
          </h1>
          <p className="qvi-lead mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            {copy.home.lead}
          </p>
          <div className="qvi-actions mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="qvi-btn">
              <Link href="/products/qv1">
                {copy.home.exploreQv1}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="qvi-btn qvi-btn-outline">
              <Link href="/tools">{copy.home.tryTools}</Link>
            </Button>
          </div>
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
        <div className="qvi-product-grid grid gap-6 lg:grid-cols-3">
          <ProductSpotlight
            name={copy.products.qv1.name}
            title={copy.products.qv1.title}
            description={copy.products.qv1.description}
            status={copy.products.qv1.status}
            features={[...copy.products.qv1.features]}
            href="/products/qv1"
            cta={copy.home.qv1Cta}
            tone="cyan"
          />
          <ProductSpotlight
            name={copy.products.neyora.name}
            title={copy.products.neyora.title}
            description={copy.products.neyora.description}
            status={copy.products.neyora.status}
            features={[...copy.products.neyora.features]}
            href="/products/neyora"
            cta={copy.home.neyoraCta}
            tone="violet"
          />
          <ProductSpotlight
            name={copy.home.toolsName}
            title={copy.home.toolsCardTitle}
            description={copy.home.toolsCardDescription}
            status={copy.home.toolsStatus}
            features={toolCategoryOrder.map((category) => copy.toolGroups[category].title)}
            href="/tools"
            cta={copy.home.toolsCta}
            tone="sand"
          />
        </div>
      </section>

      <HomeLabSection />
      <HomeToolsCategories />
      <HomeSiteExplore />
      <HomeClosingCta />
    </div>
  );
}
