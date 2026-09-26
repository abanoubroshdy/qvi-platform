"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { PasswordField } from "@/components/auth/PasswordField";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { MIN_PASSWORD_LENGTH, validatePasswordPair } from "@/lib/auth/profile";
import {
  PASSWORD_SESSIONS_NOTICE,
  PASSWORD_UPDATED_NOTICE,
  accountNoticePath,
  clearPasswordRecovery,
  hasPasswordRecovery,
  isRateLimitError,
  isSessionMissingError,
} from "@/lib/auth/recovery";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function ResetPasswordForm() {
  const { copy, locale } = useI18n();
  const { user, loading } = useAuth();
  const router = useRouter();
  const a = copy.auth;

  const [phase, setPhase] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user && hasPasswordRecovery(user.id)) {
      setPhase("ready");
      return;
    }
    setPhase("invalid");
  }, [loading, user]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    setError(null);

    if (!user || !hasPasswordRecovery(user.id)) {
      clearPasswordRecovery();
      setPhase("invalid");
      return;
    }

    const issue = validatePasswordPair(password, confirmPassword);
    if (issue === "password") {
      setError(a.shortPassword);
      return;
    }
    if (issue === "passwordMismatch") {
      setError(a.passwordMismatch);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError(a.notConfigured);
      return;
    }

    setStatus("working");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        if (isSessionMissingError(updateError)) {
          clearPasswordRecovery();
          setPhase("invalid");
          return;
        }
        setError(isRateLimitError(updateError) ? a.forgotRateLimit : updateError.message || a.genericError);
        return;
      }

      const { error: othersError } = await supabase.auth.signOut({ scope: "others" });
      clearPasswordRecovery();
      const notice = othersError ? PASSWORD_UPDATED_NOTICE : PASSWORD_SESSIONS_NOTICE;
      router.replace(accountNoticePath(locale, notice));
      router.refresh();
    } catch {
      setError(a.genericError);
    } finally {
      setStatus("idle");
    }
  }

  if (phase === "checking") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {a.loading}
        </p>
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="space-y-2" role="alert">
          <h1 className="text-2xl font-semibold tracking-tight">{a.resetInvalidTitle}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{a.resetInvalidBody}</p>
        </div>
        <Button asChild size="lg" className="h-11 w-full text-base">
          <Link href="/forgot-password">{a.requestNewLink}</Link>
        </Button>
        {user ? (
          <p className="text-sm text-muted-foreground">
            {a.resetSignedInHint}{" "}
            <Link href="/account" className="font-semibold text-primary underline-offset-4 hover:underline">
              {a.changePassword}
            </Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
              {a.backToSignIn}
            </Link>
          </p>
        )}
      </div>
    );
  }

  const passwordError = touched && password.length < MIN_PASSWORD_LENGTH ? a.shortPassword : undefined;
  const confirmError =
    touched && confirmPassword && confirmPassword !== password ? a.passwordMismatch : undefined;

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{a.resetTitle}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{a.resetLead}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <PasswordField
          id="reset-password"
          label={a.newPasswordLabel}
          value={password}
          placeholder={a.passwordPlaceholder}
          autoComplete="new-password"
          showStrength
          error={passwordError}
          onBlur={() => setTouched(true)}
          onChange={(value) => {
            setPassword(value);
            if (error) setError(null);
          }}
        />
        <PasswordField
          id="reset-password-confirm"
          label={a.confirmPasswordLabel}
          value={confirmPassword}
          placeholder={a.confirmPasswordPlaceholder}
          autoComplete="new-password"
          error={confirmError}
          onBlur={() => setTouched(true)}
          onChange={(value) => {
            setConfirmPassword(value);
            if (error) setError(null);
          }}
        />

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={status === "working"}>
          {status === "working" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {a.working}
            </>
          ) : (
            a.resetCta
          )}
        </Button>
      </form>
    </div>
  );
}
