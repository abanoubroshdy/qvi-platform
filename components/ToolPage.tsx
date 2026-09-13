import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { JsonLd } from "@/components/JsonLd";
import { siteConfig } from "@/lib/site";

export type ToolFaq = {
  question: string;
  answer: string;
};

type ToolPageProps = {
  category: string;
  title: string;
  description: string;
  children: ReactNode;
  howToTitle: string;
  howToSteps: string[];
  howToNote?: string;
  faqs: ToolFaq[];
  jsonLdName: string;
  canonicalPath: string;
  applicationCategory?: string;
};

export function ToolPage({
  category,
  title,
  description,
  children,
  howToTitle,
  howToSteps,
  howToNote,
  faqs,
  jsonLdName,
  canonicalPath,
  applicationCategory = "UtilitiesApplication",
}: ToolPageProps) {
  const url = `${siteConfig.url}${canonicalPath}`;

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: howToTitle,
    description,
    inLanguage: "ar",
    step: howToSteps.map((text, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text,
    })),
  };

  const appLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: jsonLdName,
    applicationCategory,
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    inLanguage: "ar",
    url,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <JsonLd data={faqLd} />
      <JsonLd data={howToLd} />
      <JsonLd data={appLd} />

      <header className="mb-6">
        <p className="mb-2 text-sm font-bold text-primary">{category}</p>
        <h1 className="text-3xl font-extrabold leading-snug sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-muted-foreground sm:text-base">{description}</p>
      </header>

      {children}

      <section className="mt-12 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-extrabold">{howToTitle}</h2>
        <ol className="mt-4 list-decimal space-y-3 pr-5 text-sm leading-8 sm:text-base">
          {howToSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {howToNote ? <p className="mt-4 text-sm leading-8 text-muted-foreground">{howToNote}</p> : null}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-extrabold">الأسئلة الشائعة</h2>
        <Accordion type="single" collapsible className="rounded-xl border bg-card px-4 shadow-sm">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`item-${index}`}>
              <AccordionTrigger className="text-base">{faq.question}</AccordionTrigger>
              <AccordionContent className="leading-8 text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
