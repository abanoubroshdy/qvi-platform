"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { locale, setLocale, copy } = useI18n();
  const next = locale === "ar" ? "en" : "ar";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 min-w-11 px-2 text-xs font-semibold tracking-wide"
      onClick={() => setLocale(next)}
      aria-label={next === "ar" ? copy.locale.switchToArabic : copy.locale.switchToEnglish}
    >
      {next === "ar" ? "ع" : "EN"}
    </Button>
  );
}
