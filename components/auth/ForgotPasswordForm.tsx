"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidEmail } from "@/lib/auth/profile";
import { passwordResetOutcome, passwordResetRedirectUrl } from "@/lib/auth/recovery";
import { getSupabaseClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const { copy, locale } = useI18n();
  const { configured, loading } = useAuth();
  const a = copy.auth;

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const value = email.trim().toLowerCase();
    if (!isValidEmail(value)) {
      setEmailError(a.invalidEmail);
      return;
    }
    setEmailError(null);

    const supabase = getSupabaseClient();
    if (!configured || !supabase) {
      setError(a.notConfigured);
      return;
    }

    const redirectTo = passwordResetRedirectUrl(window.location.origin, locale);
    if (!redirectTo) {
      setError(a.genericError);
      return;
    }

    setStatus("working");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(value, { redirectTo });
      const outcome = passwordResetOutcome(resetError);
      if (outcome === "rate_limited") {
        setError(a.forgotRateLimit);
        setStatus("idle");
        return;
      }
      if (outcome === "error") {
        setError(a.genericError);
        setStatus("idle");
        return;
      }
      setStatus("sent");
    } catch {
      setError(a.genericError);
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div
          className="space-y-2 rounded-2xl border border-primary/30 bg-primary/10 p-6"
          role="status"
          aria-live="polite"
        >
          <p className="inline-flex items-center gap-2 text-lg font-semibold text-primary">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            {a.forgotSentTitle}
          </p>
          <p className="text-sm leading-7 text-muted-foreground">{a.forgotSentBody}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            {a.backToSignIn}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{a.forgotTitle}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{a.forgotLead}</p>
      </div>

      {!loading && !configured ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground" role="alert">
          {a.notConfigured}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="forgot-email" className="text-sm font-semibold">
            {a.emailLabel}
            <span className="ms-1 text-destructive">*</span>
          </Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            placeholder={a.emailPlaceholder}
            value={email}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "forgot-email-error" : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              if (emailError) setEmailError(null);
              if (error) setError(null);
            }}
            className="h-11 bg-background text-foreground placeholder:text-muted-foreground/80"
          />
          {emailError ? (
            <p id="forgot-email-error" className="text-xs text-destructive" role="alert">
              {emailError}
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={status === "working" || loading}>
          {status === "working" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {a.working}
            </>
          ) : (
            a.forgotCta
          )}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          {a.backToSignIn}
        </Link>
      </p>
    </div>
  );
}
