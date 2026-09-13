import type { Metadata } from "next";
import { AudioLines, Mic2, Music2, Sparkles } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { WaitlistForm } from "@/components/WaitlistForm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { products } from "@/lib/products";
import { siteConfig } from "@/lib/site";

const pageTitle = "QV1 - AI Stem Separation Tool";
const pageDescription =
  "QV1 is QVI's professional AI engine for vocal and instrumental stem separation, de-noise, and remix workflows — designed to run on your device.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/products/qv1" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: `${siteConfig.url}/products/qv1`,
    type: "website",
  },
};

const features = [
  {
    icon: Mic2,
    title: "Stem Separation",
    text: "Pull vocals, drums, bass, and accompaniment out of a mixed recording so you can edit, sample, or score with isolated sources.",
  },
  {
    icon: Sparkles,
    title: "De-noise",
    text: "Reduce hiss, rumble, and room noise while protecting the musical core of the take.",
  },
  {
    icon: Music2,
    title: "Re-mix",
    text: "Rebuild balance, space, and presence after stems are split — without starting the mix from a blank session.",
  },
];

const specs = [
  ["Target formats", "WAV, AIFF, FLAC, MP3"],
  ["Processing", "On-device inference roadmap"],
  ["Workflow", "Studio batch, not live-stage latency"],
  ["Privacy", "Source audio stays on your machine"],
  ["Status", products.qv1.status],
  ["Platform", "Desktop-class first, web companion later"],
];

const faqs = [
  {
    question: "When will QV1 ship?",
    answer:
      "QV1 is on the waitlist. Join with your email and we will notify you as private builds open. There is no public download yet.",
  },
  {
    question: "Does QV1 upload my tracks?",
    answer:
      "The product is designed so separation and processing run on your device. We are not building a cloud-upload stem service as the default path.",
  },
  {
    question: "How is QV1 different from the free tools?",
    answer:
      "The free utilities on this site are browser helpers for images, PDFs, and QR codes. QV1 is a dedicated audio engine for stem separation and track processing.",
  },
  {
    question: "Will there be a free tier?",
    answer:
      "We will share licensing details with the waitlist. The goal is a professional tool with a clear, honest path to try it.",
  },
];

export default function Qv1Page() {
  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "QV1",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Coming soon",
          description: pageDescription,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }}
      />

      <section className="hero-grid border-b border-white/10">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            <AudioLines className="h-4 w-4" />
            Flagship engine
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">QV1</h1>
          <p className="mt-3 text-xl text-muted-foreground">{products.qv1.title}</p>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
            {products.qv1.description} Built for producers, mixers, and composers who need clean
            sources without sending a session to someone else&apos;s GPU.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-2xl border border-white/10 bg-card p-6 glow-cyan">
            <feature.icon className="mb-4 h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{feature.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-12">
        <h2 className="mb-4 text-2xl font-semibold">Tech specs</h2>
        <dl className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
          {specs.map(([label, value]) => (
            <div key={label} className="grid gap-1 px-4 py-4 sm:grid-cols-3 sm:gap-6">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium sm:col-span-2">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-12">
        <WaitlistForm product="qv1" heading="Join the QV1 waitlist" />
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <h2 className="mb-4 text-2xl font-semibold">FAQ</h2>
        <Accordion type="single" collapsible className="rounded-2xl border border-white/10 bg-card px-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`qv1-${index}`}>
              <AccordionTrigger className="text-base">{faq.question}</AccordionTrigger>
              <AccordionContent className="leading-7 text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
