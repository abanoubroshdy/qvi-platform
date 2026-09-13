import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  compact?: boolean;
};

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <Link href="/" className={cn("qvi-logo flex items-center gap-2.5", className)}>
      <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-cyan-300 via-sky-400 to-violet-500 shadow-[0_0_24px_rgba(34,211,238,0.45)]">
        <span className="flex h-5 items-end gap-[3px]" aria-hidden>
          {[0, 1, 2, 3, 4].map((index) => (
            <span
              key={index}
              className="wave-bar w-[3px] rounded-full bg-black/80"
              style={{
                height: `${10 + ((index * 7) % 11)}px`,
                animationDelay: `${index * 0.12}s`,
              }}
            />
          ))}
        </span>
      </span>
      <span className="leading-none">
        <span className="block text-lg font-semibold tracking-[0.22em]">QVI</span>
        {compact ? null : (
          <span className="hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
            Quality Virtual Instruments
          </span>
        )}
      </span>
    </Link>
  );
}
