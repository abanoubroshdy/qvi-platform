"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryMark } from "@/components/ToolArt";
import { JsonLd } from "@/components/JsonLd";
import { ToolCard } from "@/components/ToolCard";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { categoryVisuals } from "@/lib/tool-visuals";
import { getToolsByCategory, toolCategoryPath, type ToolCategory } from "@/lib/tools";
import { cn } from "@/lib/utils";

export function ToolCategoryView({ category }: { category: ToolCategory }) {
  const { copy, t } = useI18n();
  const group = copy.toolGroups[category];
  const visual = categoryVisuals[category];
  const tools = getToolsByCategory(category);

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: group.title,
          description: group.lead,
          url: `${siteConfig.url}${toolCategoryPath(category)}`,
          mainEntity: tools.map((tool) => ({
            "@type": "WebApplication",
            name: copy.toolsIndex[tool.slug].title,
            url: `${siteConfig.url}${tool.href}`,
          })),
        }}
      />

      <section className={cn("border-b border-border", visual.wrap)}>
        <div className="mx-auto max-w-4xl px-4 py-14 sm:py-16">
          <p className="mb-4">
            <Link href="/tools" className="text-sm font-semibold text-primary hover:underline">
              {copy.toolsHub.back}
            </Link>
          </p>
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-sm",
                visual.mark,
              )}
            >
              <CategoryMark category={category} className="h-10 w-10" />
            </span>
            <div>
              <p className={cn("text-xs font-semibold uppercase tracking-[0.24em]", visual.kicker)}>
                {copy.toolsHub.kicker}
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-5xl">{group.title}</h1>
              <p className="mt-3 max-w-2xl text-base leading-8 text-muted-foreground">{group.lead}</p>
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                {t(copy.toolsHub.count, { count: tools.length })}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="qvi-tool-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/tools">
              {copy.toolsHub.back}
              <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
