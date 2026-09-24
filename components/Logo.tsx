import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  compact?: boolean;
};

const LOGO_WIDTH = 1246;
const LOGO_HEIGHT = 619;

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <Link href="/" className={cn("qvi-logo inline-flex items-center", className)} aria-label="QVI">
      <Image
        src="/qvi-logo.png"
        alt="QVI"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        priority
        className={cn("qvi-logo-light w-auto object-contain", compact ? "h-8" : "h-9")}
      />
      <Image
        src="/qvi-logo-on-dark.png"
        alt=""
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        aria-hidden
        className={cn("qvi-logo-dark w-auto object-contain", compact ? "h-8" : "h-9")}
      />
    </Link>
  );
}
