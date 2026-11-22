"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { useAdminGate } from "./useAdminGate";

const NAV = [
  { href: "/admin", exact: true },
  { href: "/admin/users", exact: false },
  { href: "/admin/inbox", exact: false },
  { href: "/admin/licenses", exact: false },
  { href: "/admin/releases", exact: false },
  { href: "/admin/events", exact: false },
  { href: "/admin/traffic", exact: false },
] as const;

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const { copy } = useI18n();
  const ad = copy.adminDashboard;
  const { allowed, busy } = useAdminGate(pathname || "/admin");

  if (busy) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-6xl items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (allowed === "no") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <p className="rounded-xl border border-border bg-card p-6 text-sm">{ad.forbidden}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 lg:flex-row lg:gap-10">
      <aside className="shrink-0 lg:w-56">
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {ad.sidebarLabel}
        </p>
        <nav className="flex flex-row flex-wrap gap-1 lg:flex-col" aria-label={ad.sidebarLabel}>
          {NAV.map((item) => {
            const active =
              item.exact ? pathname === item.href : pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const key = item.href === "/admin" ? "overview" : (item.href.split("/").pop() as keyof typeof ad.nav);
            const label = ad.nav[key];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}