/**
 * Manual AdSense Display config for free /tools pages.
 * Auto ads and page-level ads are not enabled here.
 *
 * The existing unit (slot 5558098185) is a fixed 300×250 display unit.
 * Responsive `data-ad-format=auto` is for fluid units and can stay unfilled
 * on a fixed slot, so the ad component uses an explicit 300×250 size.
 */

export const DEFAULT_ADSENSE_CLIENT = "ca-pub-9019451998006609";
export const DEFAULT_ADSENSE_SLOT = "5558098185";

export const ADSENSE_UNIT_WIDTH = 300;
export const ADSENSE_UNIT_HEIGHT = 250;

const CLIENT_RE = /^ca-pub-\d+$/;
const SLOT_RE = /^\d+$/;

export type AdSensePlacement = {
  /** Empty when ads must not render. */
  client: string;
  topSlot: string;
  bottomSlot: string;
};

function readExplicit(raw: string | undefined, pattern: RegExp, fallback: string | null): string | null {
  if (raw === undefined) return fallback;
  const trimmed = raw.trim();
  return pattern.test(trimmed) ? trimmed : null;
}

/**
 * Unset env vars fall back to the known publisher and 300×250 slot.
 * A blank or invalid value disables that field (no fake placeholder).
 * The same slot is never placed twice on one page.
 */
export function resolveAdSensePlacement(
  env: Record<string, string | undefined> = process.env,
): AdSensePlacement {
  const client = readExplicit(env.NEXT_PUBLIC_ADSENSE_CLIENT, CLIENT_RE, DEFAULT_ADSENSE_CLIENT);
  const baseSlot = readExplicit(env.NEXT_PUBLIC_ADSENSE_SLOT, SLOT_RE, DEFAULT_ADSENSE_SLOT);
  const topSlot = readExplicit(env.NEXT_PUBLIC_ADSENSE_SLOT_TOP, SLOT_RE, baseSlot) ?? "";
  const bottomCandidate = readExplicit(env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM, SLOT_RE, null) ?? "";
  const bottomSlot = bottomCandidate && bottomCandidate !== topSlot ? bottomCandidate : "";

  if (!client || (!topSlot && !bottomSlot)) {
    return { client: "", topSlot: "", bottomSlot: "" };
  }

  return { client, topSlot, bottomSlot };
}

/** Account meta stays present even if a bad env value disables ad units. */
export function adsenseVerificationClient(
  env: Record<string, string | undefined> = process.env,
): string {
  const client = readExplicit(env.NEXT_PUBLIC_ADSENSE_CLIENT, CLIENT_RE, DEFAULT_ADSENSE_CLIENT);
  return client || DEFAULT_ADSENSE_CLIENT;
}

/**
 * Manual units only. The publisher id stays on each `<ins>` (`data-ad-client`).
 * Putting `?client=` on this URL is the Auto ads head tag, which also requests
 * a page-level slot. Do not add `enable_page_level_ads`.
 */
export function adsenseScriptSrc(client: string): string | null {
  if (!CLIENT_RE.test(client)) return null;
  return "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
}
