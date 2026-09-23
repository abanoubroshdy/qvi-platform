import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProductSpotlightProps = {
  name: string;
  title: string;
  description: string;
  status: string;
  features?: readonly string[];
  href: string;
  cta: string;
  tone: "cyan" | "violet" | "sand";
};

const toneClass: Record<ProductSpotlightProps["tone"], { card: string; blob: string; dot: string; badge?: string }> = {
  cyan: {
    card: "glow-cyan",
    blob: "bg-primary/15",
    dot: "bg-primary",
  },
  violet: {
    card: "glow-violet",
    blob: "bg-accent/15",
    dot: "bg-accent",
    badge: "bg-accent text-accent-foreground",
  },
  sand: {
    card: "glow-sand",
    blob: "bg-amber-400/20",
    dot: "bg-amber-500",
    badge: "bg-amber-500 text-black",
  },
};

export function ProductSpotlight({
  name,
  title,
  description,
  status,
  features,
  href,
  cta,
  tone,
}: ProductSpotlightProps) {
  const look = toneClass[tone];
  return (
    <article
      className={cn(
        "relative qvi-card overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8",
        look.card,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl",
          look.blob,
        )}
      />
      <div className="relative space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{name}</p>
          <Badge className={look.badge}>{status}</Badge>
        </div>
        <h3 className="text-2xl font-semibold leading-snug sm:text-3xl">{title}</h3>
        <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">{description}</p>
        {features?.length ? (
          <ul className="space-y-2 text-sm leading-7 text-muted-foreground">
            {features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", look.dot)} />
                {feature}
              </li>
            ))}
          </ul>
        ) : null}
        <Button asChild size="lg" className="qvi-btn" variant={tone === "sand" ? "secondary" : "default"}>
          <Link href={href}>
            {cta}
            <ArrowRight className="rtl:rotate-180" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
