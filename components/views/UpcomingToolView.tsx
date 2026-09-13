"use client";

import Link from "next/link";
import { Construction } from "lucide-react";
import { AdPlaceholder } from "@/components/AdPlaceholder";
import { ToolCard } from "@/components/ToolCard";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { getToolBySlug, tools } from "@/lib/tools";
import type { ToolSlug } from "@/lib/i18n";

export function UpcomingToolView({ slug }: { slug: string }) {
  const { copy } = useI18n();
  const tool = getToolBySlug(slug);
  if (!tool) return null;

  const labels = copy.toolsIndex[tool.slug as ToolSlug];
  const related = tools.filter((item) => item.slug !== tool.slug).slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <AdPlaceholder position="top" className="mb-6" />
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm sm:p-10">
        <Construction className="mx-auto mb-4 h-10 w-10 text-primary" aria-hidden />
        <p className="text-sm font-bold text-primary">{copy.upcoming.kicker}</p>
        <h1 className="mt-2 text-3xl font-semibold">{labels.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-muted-foreground sm:text-base">
          {labels.description} {copy.upcoming.body}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/#tools">{copy.upcoming.back}</Link>
          </Button>
        </div>
      </div>
      <AdPlaceholder position="middle" className="my-6" />
      <h2 className="mb-4 text-xl font-semibold">{copy.upcoming.other}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {related.map((item) => (
          <ToolCard key={item.slug} tool={item} />
        ))}
      </div>
      <AdPlaceholder position="bottom" className="mt-6" />
    </div>
  );
}
