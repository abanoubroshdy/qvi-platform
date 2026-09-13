import type { Metadata } from "next";
import { NeyoraDemo } from "@/components/NeyoraDemo";
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

const pageTitle = "Neyora - DDSP Instrument Synthesis";
const pageDescription =
  "Neyora is QVI's DDSP instrument lab: transform text, voice, or MIDI into realistic instrumental performance that runs toward on-device synthesis.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/products/neyora" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: `${siteConfig.url}/products/neyora`,
    type: "website",
  },
};

const steps = [
  {
    title: "Condition",
    text: "Start from a text prompt, a hummed take, or MIDI. Neyora reads intent, pitch contour, and timing — not a canned loop library.",
  },
  {
    title: "Model",
    text: "Differentiable DSP separates what should be learned (timbre, noise, expression) from what should stay physical (oscillators, filters, envelopes).",
  },
  {
    title: "Perform",
    text: "The engine renders a playable phrase you can drop into a score or session, with control instead of a one-shot sample dump.",
  },
];

const faqs = [
  {
    question: "What is DDSP?",
    answer:
      "Differentiable Digital Signal Processing combines neural networks with classic DSP blocks. Instead of generating raw waveforms blindly, the model predicts musical parameters that a synthesizer can render with more realistic control.",
  },
  {
    question: "Can I try Neyora now?",
    answer:
      "The public demo is a placeholder. You can save a prompt locally and join the waitlist. Real synthesis is still in the lab.",
  },
  {
    question: "Is this a cloud generator?",
    answer:
      "Neyora is being designed as part of the QVI on-device ecosystem. Prompts you type here are not sent to a training cluster.",
  },
];

export default function NeyoraPage() {
  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Neyora",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Coming soon",
          description: pageDescription,
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent">QVI Lab</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Neyora</h1>
          <p className="mt-3 text-xl text-muted-foreground">{products.neyora.title}</p>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
            {products.neyora.description} Built for composers who want an instrument that understands
            phrasing, not another text-to-noise toy.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="mb-3 text-2xl font-semibold">What DDSP changes</h2>
        <p className="text-sm leading-8 text-muted-foreground sm:text-base">
          Classic samplers play back recordings. Pure neural vocoders often smear pitch and lose
          editability. DDSP sits between them: the network estimates musical controls, then a
          differentiable synth renders tone you can still reason about — breath, bow, reed, room.
          Neyora uses that idea for solo instrument performance from text, voice, or MIDI.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-12">
        <h2 className="mb-4 text-2xl font-semibold">Demo</h2>
        <NeyoraDemo />
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-2xl border border-white/10 bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">0{index + 1}</p>
            <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-12">
        <WaitlistForm product="neyora" heading="Join the Neyora lab list" />
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <h2 className="mb-4 text-2xl font-semibold">FAQ</h2>
        <Accordion type="single" collapsible className="rounded-2xl border border-white/10 bg-card px-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`neyora-${index}`}>
              <AccordionTrigger className="text-base">{faq.question}</AccordionTrigger>
              <AccordionContent className="leading-7 text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
