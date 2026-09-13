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
  tone: "cyan" | "violet";
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
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-[#070b14] p-6 sm:p-8",
        tone === "cyan" ? "glow-cyan" : "glow-violet",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl",
          tone === "cyan" ? "bg-cyan-400/20" : "bg-violet-500/25",
        )}
      />
      <div className="relative space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{name}</p>
          <Badge className={tone === "violet" ? "bg-accent text-accent-foreground" : undefined}>{status}</Badge>
        </div>
        <h3 className="text-2xl font-semibold leading-snug sm:text-3xl">{title}</h3>
        <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">{description}</p>
        {features?.length ? (
          <ul className="space-y-2 text-sm leading-7 text-muted-foreground">
            {features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", tone === "cyan" ? "bg-primary" : "bg-accent")} />
                {feature}
              </li>
            ))}
          </ul>
        ) : null}
        <Button asChild size="lg" variant={tone === "cyan" ? "default" : "secondary"}>
          <Link href={href}>
            {cta}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </article>
  );
}
