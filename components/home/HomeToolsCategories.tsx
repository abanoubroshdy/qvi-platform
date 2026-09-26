"use client";

import { LocaleLink as Link } from "@/components/LocaleLink";
import { ArrowRight } from "lucide-react";
import { CategoryMark } from "@/components/ToolArt";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { categoryVisuals } from "@/lib/tool-visuals";
import { groupedTools, toolCategoryPath } from "@/lib/tools";
import { cn } from "@/lib/utils";

export function HomeToolsCategories() {
  const { copy, t } = useI18n();
  const groups = groupedTools();

  return (
    <section id="tools" className="qvi-section border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <div className="mb-8 max-w-2xl">
          <p className="qvi-kicker text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {copy.home.toolsSectionKicker}
          </p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{copy.home.toolsSectionTitle}</h2>
          <p className="qvi-lead mt-3 text-muted-foreground">{copy.home.toolsSectionLead}</p>
        </div>

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
                <h3 className={cn("text-xl font-semibold sm:text-2xl", visual.kicker)}>{group.title}</h3>
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

        <div className="qvi-actions mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="outline" className="qvi-btn qvi-btn-outline">
            <Link href="/tools">{copy.home.viewAllTools}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="qvi-btn qvi-btn-outline">
            <Link href="/tools/audio">{copy.toolGroups.audio.title}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
