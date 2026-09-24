import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Kept so existing header calls stay valid. Lockup height is always 32px. */
  compact?: boolean;
};

/**
 * Opaque bounds of the supplied 1600×1600 lockup PNGs.
 * The frame crops to that box so the wordmark is 32px tall without redrawing.
 */
const LOCKUP = { x: 214, y: 602, width: 1168, height: 463, source: 1600 } as const;

const markStyle = {
  position: "absolute" as const,
  height: `calc(2rem * ${LOCKUP.source} / ${LOCKUP.height})`,
  width: `calc(2rem * ${LOCKUP.source} / ${LOCKUP.height})`,
  maxWidth: "none",
  left: `calc(2rem * -${LOCKUP.x} / ${LOCKUP.height})`,
  top: `calc(2rem * -${LOCKUP.y} / ${LOCKUP.height})`,
};

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <Link href="/" aria-label="QVI" className={cn("qvi-logo", compact && "qvi-logo-compact", className)}>
      <span className="qvi-logo-frame">
        <Image
          src="/qvi-logo.png"
          alt=""
          width={LOCKUP.source}
          height={LOCKUP.source}
          className="qvi-logo-img qvi-logo-on-light"
          style={markStyle}
          priority
        />
        <Image
          src="/qvi-logo-on-dark.png"
          alt=""
          width={LOCKUP.source}
          height={LOCKUP.source}
          className="qvi-logo-img qvi-logo-on-dark"
          style={markStyle}
          priority
        />
      </span>
    </Link>
  );
}
