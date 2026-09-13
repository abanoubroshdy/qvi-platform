import { ar } from "./ar";
import { en, type Messages } from "./en";

export type Locale = "en" | "ar";
export type { Messages, ToolSlug, LiveToolSlug } from "./en";

export const locales: Locale[] = ["en", "ar"];
export const defaultLocale: Locale = "en";
export const LOCALE_STORAGE_KEY = "qvi-locale";
export const THEME_STORAGE_KEY = "qvi-theme";

export const messages: Record<Locale, Messages> = { en, ar };

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "ar";
}

export function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] === undefined || vars[key] === null ? "" : String(vars[key]),
  );
}
