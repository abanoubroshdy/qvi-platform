"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { copy } = useI18n();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session || user) {
        router.replace("/account");
        return;
      }
      window.setTimeout(() => {
        if (!cancelled) router.replace("/login");
      }, 1500);
    });

    return () => {
      cancelled = true;
    };
  }, [router, user, loading]);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {copy.auth.loading}
      </p>
    </section>
  );
}
