"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm() {
  const { copy, t } = useI18n();
  const { configured } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState<string | null>(null);

  const a = copy.auth;
  const isSignUp = mode === "signup";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError(a.invalidEmail);
      return;
    }
    if (password.length < 6) {
      setError(a.shortPassword);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError(a.notConfigured);
      return;
    }

    setStatus("working");
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: value,
          password,
        });
        if (signUpError) {
          setError(signUpError.message || a.genericError);
          return;
        }
        // When email confirmation is required, no session is returned.
        if (data.session) {
          router.push("/account");
          router.refresh();
          return;
        }
        setConfirmSent(value);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: value,
        password,
      });
      if (signInError) {
        setError(signInError.message || a.genericError);
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError(a.genericError);
    } finally {
      setStatus("idle");
    }
  }

  if (confirmSent) {
    return (
      <div
        className="space-y-2 rounded-2xl border border-primary/30 bg-primary/10 p-6"
        role="status"
        aria-live="polite"
      >
        <p className="inline-flex items-center gap-2 text-lg font-semibold text-primary">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          {a.checkEmailTitle}
        </p>
        <p className="text-sm leading-7 text-muted-foreground">
          {t(a.checkEmailBody, { email: confirmSent })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{isSignUp ? a.signUpTitle : a.signInTitle}</h1>
        <p className="text-sm text-muted-foreground">{isSignUp ? a.signUpLead : a.signInLead}</p>
      </div>

      {!configured ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground" role="alert">
          {a.notConfigured}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="auth-email">{a.emailLabel}</Label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            placeholder={a.emailPlaceholder}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError(null);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="auth-password">{a.passwordLabel}</Label>
          <Input
            id="auth-password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            placeholder={a.passwordPlaceholder}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError(null);
            }}
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={status === "working"}>
          {status === "working" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {a.working}
            </>
          ) : isSignUp ? (
            a.signUpCta
          ) : (
            a.signInCta
          )}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {isSignUp ? a.haveAccount : a.noAccount}{" "}
        <button
          type="button"
          className="font-semibold text-primary underline-offset-4 hover:underline"
          onClick={() => {
            setMode(isSignUp ? "signin" : "signup");
            setError(null);
          }}
        >
          {isSignUp ? a.switchToSignIn : a.switchToSignUp}
        </button>
      </p>
    </div>
  );
}
