"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const options = [
  { id: "light", icon: Sun },
  { id: "dark", icon: Moon },
  { id: "system", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { copy } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const labels = {
    light: copy.theme.light,
    dark: copy.theme.dark,
    system: copy.theme.system,
  };

  return (
    <div
      className="inline-flex items-center rounded-lg border border-border bg-card p-0.5"
      role="group"
      aria-label={copy.theme.label}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = mounted && theme === option.id;
        return (
          <Button
            key={option.id}
            type="button"
            size="icon"
            variant="ghost"
            className={cn(
              "h-8 w-8 rounded-md",
              active && "bg-secondary text-foreground",
            )}
            aria-label={labels[option.id]}
            aria-pressed={active}
            onClick={() => setTheme(option.id)}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}
