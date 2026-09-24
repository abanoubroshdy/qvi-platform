import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  compact?: boolean;
};

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <Link href="/" className={cn("qvi-logo flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-[#F8FAFC] shadow-sm",
          compact ? "h-10 px-2 py-1" : "h-12 px-2.5 py-1.5",
        )}
      >
        <Image
          src="/qvi-logo.png"
          alt="QVI — Audio AI Software"
          width={640}
          height={360}
          className="h-full w-auto object-contain object-center"
          priority
        />
      </span>
    </Link>
  );
}
