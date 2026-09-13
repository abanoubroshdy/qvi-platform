"use client";

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

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) {
      setLocaleState(stored);
      applyDocumentLocale(stored);
      return;
    }
    const next: Locale = navigator.language.toLowerCase().startsWith("ar") ? "ar" : "en";
    setLocaleState(next);
    applyDocumentLocale(next);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    applyDocumentLocale(next);
  }, []);

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
