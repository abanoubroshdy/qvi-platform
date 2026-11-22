"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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
import {
  isLocalizedRoute,
  resolveLocaleForPath,
  stripLocale,
  toggledLocale,
  withLocale,
} from "@/lib/i18n/locale-path";

type I18nContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  copy: Messages;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (template: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(fallback: Locale): Locale {
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode */
  }
}

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
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [preferenceLocale, setPreferenceLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    setPreferenceLocale(readStoredLocale(initialLocale));
  }, [initialLocale]);

  const locale = useMemo(
    () => resolveLocaleForPath(pathname, preferenceLocale),
    [pathname, preferenceLocale],
  );

  useEffect(() => {
    applyDocumentLocale(locale);
    persistLocale(locale);
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      const bare = stripLocale(pathname);
      const search = window.location.search;
      const hash = window.location.hash;
      setPreferenceLocale(next);

      if (isLocalizedRoute(bare)) {
        router.push(`${withLocale(bare, next)}${search}${hash}`);
      }
    },
    [pathname, router],
  );

  const toggleLocale = useCallback(() => {
    setLocale(toggledLocale(pathname, locale));
  }, [locale, pathname, setLocale]);

  const value = useMemo<I18nContextValue>(() => {
    const copy = messages[locale];
    return {
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      copy,
      setLocale,
      toggleLocale,
      t: interpolate,
    };
  }, [locale, setLocale, toggleLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}