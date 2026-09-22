"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { ProductSpotlight } from "@/components/ProductSpotlight";
import { QviStudioApp } from "@/components/studio/QviStudioApp";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { products } from "@/lib/products";
import { siteConfig } from "@/lib/site";
import { toolCategoryOrder } from "@/lib/tools";

export function HomeView() {
  const { copy } = useI18n();

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: siteConfig.fullName,
          url: siteConfig.url,
          slogan: copy.home.kicker,
          description: siteConfig.description,
        }}
      />

      <section className="border-b border-border">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="qvi-kicker text-xs font-semibold uppercase tracking-[0.28em] text-primary">{copy.home.kicker}</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{copy.home.studioTitle}</h1>
            <p className="qvi-lead mt-2 text-sm leading-7 text-muted-foreground sm:text-base">{copy.home.studioLead}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="qvi-btn qvi-btn-outline">
              <Link href={products.qv1.href}>
                {copy.home.exploreQv1}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" className="qvi-btn qvi-btn-outline">
              <Link href={products.neyora.href}>{copy.home.neyoraCta}</Link>
            </Button>
            <Button asChild variant="outline" className="qvi-btn qvi-btn-outline">
              <Link href="/tools">{copy.home.tryTools}</Link>
            </Button>
          </div>
        </div>
      </section>

      <QviStudioApp />

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
            href={products.qv1.href}
            cta={copy.home.qv1Cta}
            tone="cyan"
          />
          <ProductSpotlight
            name={copy.products.neyora.name}
            title={copy.products.neyora.title}
            description={copy.products.neyora.description}
            status={copy.products.neyora.status}
            features={[...copy.products.neyora.features]}
            href={products.neyora.href}
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
    </div>
  );
}
