"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryMark } from "@/components/ToolArt";
import { JsonLd } from "@/components/JsonLd";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { categoryVisuals } from "@/lib/tool-visuals";
import { groupedTools, toolCategoryPath } from "@/lib/tools";
import { cn } from "@/lib/utils";

export function ToolsHubView() {
  const { copy, t } = useI18n();
  const groups = groupedTools();

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: copy.toolsHub.title,
          description: copy.toolsHub.lead,
          url: `${siteConfig.url}/tools`,
          hasPart: groups.map(({ category }) => ({
            "@type": "CollectionPage",
            name: copy.toolGroups[category].title,
            url: `${siteConfig.url}${toolCategoryPath(category)}`,
          })),
        }}
      />

      <section className="hero-grid border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {copy.toolsHub.kicker}
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">{copy.toolsHub.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">{copy.toolsHub.lead}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(({ category, tools }) => {
            const group = copy.toolGroups[category];
            const visual = categoryVisuals[category];
            return (
              <Link
                key={category}
                href={toolCategoryPath(category)}
                className={cn(
                  "qvi-card group flex h-full flex-col rounded-3xl border p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg",
                  visual.wrap,
                )}
              >
                <span
                  className={cn(
                    "mb-5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-sm",
                    visual.mark,
                  )}
                >
                  <CategoryMark category={category} className="h-10 w-10" />
                </span>
                <h2 className={cn("text-xl font-semibold sm:text-2xl", visual.kicker)}>{group.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-7 text-muted-foreground">{group.lead}</p>
                <span className="mt-5 inline-flex items-center justify-between gap-3 text-sm font-semibold text-primary">
                  {t(copy.toolsHub.count, { count: tools.length })}
                  <span className="inline-flex items-center gap-1">
                    {copy.toolsHub.open}
                    <ArrowRight
                      className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
        <div className="mt-10">
          <Button asChild variant="outline">
            <Link href="/">{copy.toolsHub.backHome}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
