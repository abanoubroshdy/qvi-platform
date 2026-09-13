import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { ProductSpotlight } from "@/components/ProductSpotlight";
import { ToolCard } from "@/components/ToolCard";
import { Button } from "@/components/ui/button";
import { products } from "@/lib/products";
import { siteConfig } from "@/lib/site";
import { tools } from "@/lib/tools";

export const metadata: Metadata = {
  title: "QVI - Quality Virtual Instruments | AI Audio Tools & Software",
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: siteConfig.fullName,
          url: siteConfig.url,
          slogan: siteConfig.tagline,
          description: siteConfig.description,
        }}
      />

      <section className="hero-grid border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 lg:py-24">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            {siteConfig.tagline}
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            QVI - Quality Virtual Instruments
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            We build intelligent audio tools that run on your device. From stem separation to DDSP
            instrument synthesis.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/products/qv1">
                Explore QV1
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/#tools">Try Free Tools</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Flagship products</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Audio software, not just utilities</h2>
          <p className="mt-3 text-muted-foreground">
            QV1 and Neyora are the core of the QVI ecosystem — professional instruments designed to
            stay on your machine.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ProductSpotlight
            name={products.qv1.name}
            title={products.qv1.title}
            description={products.qv1.description}
            status={products.qv1.status}
            features={products.qv1.features}
            href={products.qv1.href}
            cta="Join Waitlist"
            tone="cyan"
          />
          <ProductSpotlight
            name={products.neyora.name}
            title={products.neyora.title}
            description={products.neyora.description}
            status={products.neyora.status}
            features={products.neyora.features}
            href={products.neyora.href}
            cta="Explore Lab"
            tone="violet"
          />
        </div>
      </section>

      <section id="tools" className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Utilities</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Free Online Tools - Powered by QVI</h2>
            <p className="mt-3 text-muted-foreground">
              Fast browser utilities that process files locally. Use them freely while the flagship
              audio engines come online.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
