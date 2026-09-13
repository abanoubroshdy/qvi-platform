"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Tool } from "@/lib/tools";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  const { copy } = useI18n();
  const labels = copy.toolsIndex[tool.slug];

  return (
    <Link href={tool.href} className="qvi-card group block h-full">
      <Card className="h-full border-border bg-card/80 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="flex flex-wrap justify-end gap-1">
              <Badge variant="outline">{copy.common.freeUtility}</Badge>
              <Badge variant={tool.available ? "default" : "secondary"}>
                {tool.available ? copy.common.live : copy.common.soon}
              </Badge>
            </div>
          </div>
          <CardTitle className="text-base leading-7">{labels.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="leading-6">{labels.description}</CardDescription>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            {copy.common.openTool}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
