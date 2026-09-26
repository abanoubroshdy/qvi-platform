"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createQv1AutostartToken, postAuthPath } from "@/lib/qv1-download";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { user, loading, configured } = useAuth();
  const { copy } = useI18n();
  const autostartToken = useRef(createQv1AutostartToken());

  useEffect(() => {
    if (loading) return;

    const supabase = getSupabaseClient();
    if (!configured || !supabase) {
      router.replace("/login");
      return;
    }

    const next = postAuthPath(new URLSearchParams(window.location.search).get("next"), autostartToken.current);
    const loginPath = next === "/account" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session || user) {
        router.replace(next);
        return;
      }
      window.setTimeout(() => {
        if (!cancelled) router.replace(loginPath);
      }, 1500);
    });

    return () => {
      cancelled = true;
    };
  }, [configured, loading, router, user]);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {copy.auth.loading}
      </p>
    </section>
  );
}
