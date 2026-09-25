import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  compact?: boolean;
};

const WORDMARK_WIDTH = 480;
const WORDMARK_HEIGHT = 191;

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <Link href="/" className={cn("qvi-logo inline-flex items-center", className)} aria-label="QVI">
      <span className={cn("qvi-logo-frame", compact ? "qvi-logo-frame-header" : "qvi-logo-frame-footer")}>
        <Image
          src="/brand/qvi-wordmark.webp"
          alt="QVI"
          width={WORDMARK_WIDTH}
          height={WORDMARK_HEIGHT}
          priority
          unoptimized
          sizes="162px"
          className="qvi-logo-light"
        />
        <Image
          src="/brand/qvi-wordmark-on-dark.webp"
          alt=""
          width={WORDMARK_WIDTH}
          height={WORDMARK_HEIGHT}
          unoptimized
          sizes="162px"
          aria-hidden
          className="qvi-logo-dark"
        />
      </span>
    </Link>
  );
}
