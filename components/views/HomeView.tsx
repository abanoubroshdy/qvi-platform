"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { ProductSpotlight } from "@/components/ProductSpotlight";
import { ToolCard } from "@/components/ToolCard";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { groupedTools } from "@/lib/tools";

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
              <Link href="/#tools">{copy.home.tryTools}</Link>
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
        <div className="qvi-product-grid grid gap-6 lg:grid-cols-2">
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
        </div>
      </section>

      <section id="tools" className="qvi-section scroll-mt-20 border-t border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
          <div className="mb-10 max-w-2xl">
            <p className="qvi-kicker text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {copy.home.toolsKicker}
            </p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{copy.home.toolsTitle}</h2>
            <p className="qvi-lead mt-3 text-muted-foreground">{copy.home.toolsLead}</p>
          </div>
          <div className="qvi-tool-groups space-y-12">
            {groupedTools().map(({ category, tools: groupTools }) => {
              const group = copy.toolGroups[category];
              return (
                <div key={category} className="qvi-tool-group">
                  <div className="mb-4 max-w-2xl">
                    <h3 className="text-xl font-semibold sm:text-2xl">{group.title}</h3>
                    <p className="qvi-lead mt-1 text-sm leading-7 text-muted-foreground">{group.lead}</p>
                  </div>
                  <div className="qvi-tool-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {groupTools.map((tool) => (
                      <ToolCard key={tool.slug} tool={tool} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
