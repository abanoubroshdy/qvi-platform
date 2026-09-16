"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";

export function AccountView() {
  const { user, loading, signOut } = useAuth();
  const { copy } = useI18n();
  const router = useRouter();
  const a = copy.auth;

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {a.loading}
        </p>
      </section>
    );
  }

  const createdAt = user.created_at ? new Date(user.created_at) : null;

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">{a.accountTitle}</h1>

        <dl className="space-y-4">
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{a.signedInAs}</dt>
            <dd className="break-all text-base font-medium">{user.email}</dd>
          </div>
          {createdAt ? (
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{a.memberSince}</dt>
              <dd className="text-base font-medium">
                {createdAt.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" className="flex-1" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" aria-hidden />
            {a.signOut}
          </Button>
          <Button asChild variant="secondary" className="flex-1">
            <Link href="/">{a.backHome}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
