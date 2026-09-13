"use client";

import { I18nProvider } from "@/components/i18n/I18nProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  );
}
