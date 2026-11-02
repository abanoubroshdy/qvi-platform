import { isCountryCode } from "@/lib/geo/countries";

/** First present value wins. An invalid code does not fall through to a later signal. */
const COUNTRY_HEADERS = ["x-vercel-ip-country", "cf-ipcountry", "x-country-code"] as const;

type HeaderSource = {
  get(name: string): string | null;
};

export type GeoCountrySignals = {
  /** `request.cf.country` when the Workers runtime left it on the Request. */
  requestCfCountry?: string | null;
  /** OpenNext copies `request.cf` onto `getCloudflareContext().cf`. */
  contextCfCountry?: string | null;
  headers: HeaderSource;
};

function firstPresent(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value) return value;
  }
  return null;
}

export function requestCfCountry(request: Request): string | null {
  const cf = (request as Request & { cf?: { country?: unknown } }).cf;
  return typeof cf?.country === "string" ? cf.country : null;
}

/**
 * Country for `/api/geo`. Cloudflare `request.cf.country` is preferred.
 * Vercel keeps working through `x-vercel-ip-country` when `cf` is absent.
 */
export function resolveGeoCountry(signals: GeoCountrySignals): string | null {
  const headerValues = COUNTRY_HEADERS.map((name) => signals.headers.get(name));
  const raw = firstPresent([signals.requestCfCountry, signals.contextCfCountry, ...headerValues]);
  const country = raw?.trim().toUpperCase();
  if (!country || country === "XX" || !isCountryCode(country)) return null;
  return country;
}
