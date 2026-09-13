import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Tool } from "@/lib/tools";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ToolCardProps = {
  tool: Tool;
};

export function ToolCard({ tool }: ToolCardProps) {
  const Icon = tool.icon;

  return (
    <Link href={tool.href} className="group block h-full">
      <Card className="h-full transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <Badge variant={tool.available ? "default" : "secondary"}>
              {tool.available ? "متاحة الآن" : "قريباً"}
            </Badge>
          </div>
          <CardTitle className="text-base leading-7">{tool.title}</CardTitle>
          <p className="text-xs text-muted-foreground">{tool.titleEn}</p>
        </CardHeader>
        <CardContent>
          <CardDescription className="leading-6">{tool.description}</CardDescription>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            افتح الأداة
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" aria-hidden />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
