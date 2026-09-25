"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  interpolate,
  isLocale,
  LOCALE_STORAGE_KEY,
  messages,
  type Locale,
  type Messages,
} from "@/lib/i18n";
import { isLocalizedRoute, stripLocale, withLocale } from "@/lib/i18n/locale-path";

type I18nContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  copy: Messages;
  setLocale: (locale: Locale) => void;
  t: (template: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function applyDocumentLocale(locale: Locale) {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = locale === "ar" ? "rtl" : "ltr";
  root.dataset.locale = locale;
}

export function I18nProvider({
  children,
  initialLocale = "en",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const locale = isLocale(initialLocale) ? initialLocale : "en";
  const router = useRouter();
  const pathname = usePathname() || "/";

  useEffect(() => {
    applyDocumentLocale(locale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* private mode */
    }
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      const bare = stripLocale(pathname);
      const hash = window.location.hash;
      const target = isLocalizedRoute(bare) ? withLocale(bare, next) : withLocale("/", next);
      router.push(`${target}${hash}`);
    },
    [pathname, router],
  );

  const value = useMemo<I18nContextValue>(() => {
    const copy = messages[locale];
    return {
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      copy,
      setLocale,
      t: interpolate,
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
