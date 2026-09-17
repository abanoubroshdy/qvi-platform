"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolArt } from "@/components/ToolArt";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Badge } from "@/components/ui/badge";
import { toolVisuals } from "@/lib/tool-visuals";
import type { Tool } from "@/lib/tools";

export function ToolCard({ tool }: { tool: Tool }) {
  const { copy } = useI18n();
  const labels = copy.toolsIndex[tool.slug];
  const visual = toolVisuals[tool.slug];

  return (
    <Link href={tool.href} className="qvi-tool-card group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
        <div className="relative h-36 overflow-hidden sm:h-40" style={{ background: visual.background }}>
          <ToolArt
            slug={tool.slug}
            className="transition duration-300 group-hover:scale-[1.05]"
          />
          <span className="absolute bottom-3 start-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white backdrop-blur-sm">
            {visual.caption}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex flex-wrap gap-1">
            <Badge variant="outline">{copy.common.freeUtility}</Badge>
            {tool.category === "audio" ? <Badge variant="outline">{copy.common.fresh}</Badge> : null}
            <Badge variant={tool.available ? "default" : "secondary"}>
              {tool.available ? copy.common.live : copy.common.soon}
            </Badge>
          </div>
          <h3 className="text-base font-semibold leading-7">{labels.title}</h3>
          <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{labels.description}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            {copy.common.openTool}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
          </span>
        </div>
      </article>
    </Link>
  );
}
