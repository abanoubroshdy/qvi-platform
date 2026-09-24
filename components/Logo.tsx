import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  compact?: boolean;
};

const LOGO_WIDTH = 1600;
const LOGO_HEIGHT = 1600;

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <Link href="/" className={cn("qvi-logo inline-flex items-center", className)} aria-label="QVI">
      <span className={cn("qvi-logo-frame", compact ? "qvi-logo-frame-header" : "qvi-logo-frame-footer")}>
        <Image
          src="/qvi-logo.png"
          alt="QVI"
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          priority
          unoptimized
          className="qvi-logo-light"
        />
        <Image
          src="/qvi-logo-on-dark.png"
          alt=""
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          unoptimized
          aria-hidden
          className="qvi-logo-dark"
        />
      </span>
    </Link>
  );
}
