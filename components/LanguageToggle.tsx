"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { alternatePath } from "@/lib/i18n/locale-path";

export function LanguageToggle() {
  const pathname = usePathname() || "/";
  const { locale, copy } = useI18n();
  const next = locale === "ar" ? "en" : "ar";
  const [hash, setHash] = useState("");

  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [pathname]);

  const href = `${alternatePath(pathname)}${hash}`;

  return (
    <Button asChild variant="outline" size="sm" className="h-8 min-w-11 px-2 text-xs font-semibold tracking-wide">
      <Link
        href={href}
        hrefLang={next}
        aria-label={next === "ar" ? copy.locale.switchToArabic : copy.locale.switchToEnglish}
      >
        {next === "ar" ? "ع" : "EN"}
      </Link>
    </Button>
  );
}
