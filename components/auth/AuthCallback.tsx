"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createQv1AutostartToken } from "@/lib/qv1-download";
import { withLocale } from "@/lib/i18n/locale-path";
import {
  RESET_PASSWORD_PATH,
  callbackPathWithoutSecrets,
  clearPasswordRecovery,
  decideAuthCallback,
  hasPasswordRecovery,
  markPasswordRecovery,
  previewAuthCallback,
  readAuthCallback,
} from "@/lib/auth/recovery";

type CallbackNav = { path: string };

const callbackJobs = new Map<string, Promise<CallbackNav>>();
let landingHref: string | null = null;

function rememberLandingHref(): string {
  if (!landingHref) landingHref = window.location.href;
  return landingHref;
}

async function navigateAuthCallback(href: string, autostartToken: string): Promise<CallbackNav> {
  const supabase = getSupabaseClient();
  if (!supabase) return { path: "/login" };

  const request = readAuthCallback(href, autostartToken);
  const preview = previewAuthCallback(request);
  if (preview?.kind === "recovery-error") {
    clearPasswordRecovery();
    return { path: RESET_PASSWORD_PATH };
  }

  if (preview?.kind === "verify-otp") {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: preview.tokenHash,
      type: preview.otpType,
    });
    if (error || !data.session) {
      if (preview.recovery) {
        clearPasswordRecovery();
        return { path: RESET_PASSWORD_PATH };
      }
      const failed = decideAuthCallback(
        {
          tokenHash: null,
          otpType: null,
          hasUrlError: false,
          next: preview.fallbackNext,
          recoveryIntent: false,
        },
        { hasUser: false, recoveryMarked: false },
      );
      if (failed.kind === "sign-in" || failed.kind === "continue") return { path: failed.path };
      return { path: "/login" };
    }
    if (preview.recovery) {
      if (data.session.user?.id) markPasswordRecovery(data.session.user.id);
      return { path: RESET_PASSWORD_PATH };
    }
    return { path: preview.fallbackNext };
  }

  const { data } = await supabase.auth.getUser();
  const decision = decideAuthCallback(request, {
    hasUser: Boolean(data.user),
    recoveryMarked: hasPasswordRecovery(data.user?.id),
  });
  if (decision.kind === "reset" || decision.kind === "reset-invalid") return { path: RESET_PASSWORD_PATH };
  return { path: decision.path };
}

export function AuthCallback() {
  const router = useRouter();
  const { loading, configured } = useAuth();
  const { copy, locale } = useI18n();
  const autostartToken = useRef(createQv1AutostartToken());

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const href = rememberLandingHref();
    const clean = callbackPathWithoutSecrets(href);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (clean !== current) {
      window.history.replaceState(window.history.state, "", clean);
    }

    if (!configured) {
      if (!cancelled) router.replace(withLocale("/login", locale));
      return () => {
        cancelled = true;
      };
    }

    let job = callbackJobs.get(href);
    if (!job) {
      job = navigateAuthCallback(href, autostartToken.current);
      callbackJobs.set(href, job);
    }
    void job.then((result) => {
      if (!cancelled) router.replace(withLocale(result.path, locale));
    });
    return () => {
      cancelled = true;
    };
  }, [configured, loading, locale, router]);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {copy.auth.loading}
      </p>
    </section>
  );
}
