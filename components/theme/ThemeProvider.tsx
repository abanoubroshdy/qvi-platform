"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { THEME_STORAGE_KEY } from "@/lib/i18n";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
