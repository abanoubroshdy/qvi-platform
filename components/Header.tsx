"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { HeaderAuth } from "@/components/auth/HeaderAuth";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const [open, setOpen] = useState(false);
  const { copy } = useI18n();

  const navItems = [
    { href: "/studio", label: copy.nav.studio },
    { href: "/#products", label: copy.nav.products },
    { href: "/#tools", label: copy.nav.tools },
    { href: "/#lab", label: copy.nav.lab },
    { href: "/about", label: copy.nav.about },
    { href: "/contact", label: copy.nav.contact },
  ];

  return (
    <header className="qvi-header sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="qvi-header-inner mx-auto flex h-16 max-w-6xl flex-nowrap items-center justify-between gap-3 px-4">
        <Logo compact />

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
            <Link href="/products/qv1">{copy.nav.exploreQv1}</Link>
          </Button>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <HeaderAuth />
          <LanguageToggle />
          <ThemeToggle />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="qvi-menu-btn lg:hidden"
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
            <Link href="/products/qv1" onClick={() => setOpen(false)}>
              {copy.nav.exploreQv1}
            </Link>
          </Button>
          <div className="mt-2">
            <HeaderAuth onNavigate={() => setOpen(false)} />
          </div>
        </nav>
      </div>
    </header>
  );
}
