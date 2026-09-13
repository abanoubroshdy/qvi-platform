"use client";

import { NeyoraDemo } from "@/components/NeyoraDemo";
import { JsonLd } from "@/components/JsonLd";
import { WaitlistForm } from "@/components/WaitlistForm";
import { useI18n } from "@/components/i18n/I18nProvider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function NeyoraView() {
  const { copy } = useI18n();
  const page = copy.products.neyora;

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Neyora",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Coming soon",
          description: page.description,
        }}
      />

      <section className="hero-grid border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent">{page.kicker}</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Neyora</h1>
          <p className="mt-3 text-xl text-muted-foreground">{page.title}</p>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
            {page.description} {page.extra}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="mb-3 text-2xl font-semibold">{page.ddspTitle}</h2>
        <p className="text-sm leading-8 text-muted-foreground sm:text-base">{page.ddspBody}</p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-12">
        <h2 className="mb-4 text-2xl font-semibold">{page.demoTitle}</h2>
        <NeyoraDemo />
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 sm:grid-cols-3">
        {page.steps.map((step, index) => (
          <div key={step.title} className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">0{index + 1}</p>
            <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-12">
        <WaitlistForm product="neyora" heading={page.waitlistHeading} />
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <h2 className="mb-4 text-2xl font-semibold">{copy.common.faq}</h2>
        <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-4">
          {page.faqs.map((faq, index) => (
            <AccordionItem key={faq.q} value={`neyora-${index}`}>
              <AccordionTrigger className="text-base">{faq.q}</AccordionTrigger>
              <AccordionContent className="leading-7 text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
