"use client";

import type { ReactNode } from "react";
import { ToolPage } from "@/components/ToolPage";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { LiveToolSlug } from "@/lib/i18n";
import { getToolBySlug, toolCategoryPath } from "@/lib/tools";

export function LiveToolView({ slug, children }: { slug: LiveToolSlug; children: ReactNode }) {
  const { copy } = useI18n();
  const page = copy.toolPages[slug];
  const tool = getToolBySlug(slug);

  return (
    <ToolPage
      slug={slug}
      category={page.category}
      categoryHref={tool ? toolCategoryPath(tool.category) : "/tools"}
      title={page.title}
      description={page.description}
      howToTitle={page.howToTitle}
      howToSteps={[...page.howToSteps]}
      howToNote={page.howToNote}
      faqs={page.faqs.map((faq) => ({ question: faq.q, answer: faq.a }))}
      faqTitle={copy.common.faq}
      jsonLdName={`${copy.toolsIndex[slug].title} | QVI`}
      canonicalPath={`/tools/${slug}`}
    >
      {children}
    </ToolPage>
  );
}
