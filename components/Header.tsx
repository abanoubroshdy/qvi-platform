"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { HeaderAuth } from "@/components/auth/HeaderAuth";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { headerNavItems, qv1Path } from "@/lib/site-nav";
import { cn } from "@/lib/utils";

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const studio = pathname === "/studio";
  const { copy } = useI18n();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const navItems = headerNavItems.map((item) => ({
    href: item.href,
    label: copy.nav[item.labelKey],
  }));

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={cn("qvi-header sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl", studio && "studio-site-header")}>
      <div className="qvi-header-inner mx-auto flex h-16 w-full min-w-0 max-w-6xl items-center justify-between gap-2 px-4">
        <Logo compact className="min-w-0 shrink" />

        <nav className="qvi-nav-desktop hidden items-center gap-1 lg:flex" aria-label={copy.nav.primary}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Button asChild size="sm" className="qvi-btn ms-2">
            <Link href={qv1Path}>{copy.nav.exploreQv1}</Link>
          </Button>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="qvi-header-auth hidden sm:block">
            <HeaderAuth />
          </div>
          <LanguageToggle />
          <div className="qvi-header-theme hidden md:block">
            <ThemeToggle />
          </div>
          <Button
            ref={menuButtonRef}
            type="button"
            variant="secondary"
            size="icon"
            className="qvi-menu-btn shrink-0 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? copy.nav.closeMenu : copy.nav.openMenu}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      <div
        id="mobile-nav"
        data-open={open ? "true" : "false"}
        className={cn("qvi-nav-mobile border-t border-border lg:hidden", open ? "block" : "hidden")}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label={copy.nav.mobile}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Button asChild size="sm" className="qvi-btn mt-2">
            <Link href={qv1Path} onClick={() => setOpen(false)}>
              {copy.nav.exploreQv1}
            </Link>
          </Button>
          <div className="qvi-header-auth-mobile mt-2 sm:hidden">
            <HeaderAuth onNavigate={() => setOpen(false)} />
          </div>
          <div className="qvi-header-theme-mobile mt-3 border-t border-border pt-3 md:hidden">
            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {copy.theme.label}
            </p>
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
