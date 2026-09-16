"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";

export function HeaderAuth({ onNavigate }: { onNavigate?: () => void }) {
  const { user, loading, configured } = useAuth();
  const { copy } = useI18n();

  if (!configured) return null;

  if (loading) {
    return <span className="h-8 w-8" aria-hidden />;
  }

  if (user) {
    const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
    const label = fullName.split(/\s+/)[0] || copy.nav.account;
    return (
      <Button asChild variant="secondary" size="sm" className="gap-2" onClick={onNavigate}>
        <Link href="/account" aria-label={copy.nav.account}>
          <UserRound className="h-4 w-4" aria-hidden />
          <span className="hidden max-w-[9rem] truncate sm:inline">{label}</span>
        </Link>
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" size="sm" onClick={onNavigate}>
      <Link href="/login">{copy.nav.signIn}</Link>
    </Button>
  );
}
