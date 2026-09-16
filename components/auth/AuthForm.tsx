"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { ProfileFields, type ProfileFormValues } from "@/components/auth/ProfileFields";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { saveProfile } from "@/lib/supabase/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  toAuthMetadata,
  toE164,
  validateSignIn,
  validateSignUpInput,
  type ProfileIssue,
} from "@/lib/auth/profile";
import { detectCountryFromLocale } from "@/lib/geo/countries";

type Mode = "signin" | "signup";

function emptyProfile(locale: string, language: string): ProfileFormValues {
  return {
    fullName: "",
    gender: "",
    country: detectCountryFromLocale(locale, language),
    dateOfBirth: "",
    nationalPhone: "",
  };
}

export function AuthForm({ initialMode = "signin" }: { initialMode?: Mode }) {
  const { copy, t, locale } = useI18n();
  const { configured } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profile, setProfile] = useState<ProfileFormValues>(() =>
    emptyProfile(locale, typeof navigator === "undefined" ? locale : navigator.language),
  );
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState<string | null>(null);

  const a = copy.auth;
  const isSignUp = mode === "signup";

  const issueCopy = useMemo<Record<ProfileIssue, string>>(
    () => ({
      email: a.invalidEmail,
      password: a.shortPassword,
      passwordMismatch: a.passwordMismatch,
      fullName: a.invalidName,
      gender: a.invalidGender,
      country: a.invalidCountry,
      dateOfBirth: a.invalidDob,
      tooYoung: a.tooYoung,
      tooOld: a.tooOld,
      phone: a.invalidPhone,
    }),
    [a],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const value = email.trim().toLowerCase();
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError(a.notConfigured);
      return;
    }

    if (!isSignUp) {
      const issue = validateSignIn(value, password);
      if (issue) {
        setError(issueCopy[issue]);
        return;
      }

      setStatus("working");
      try {
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
      return;
    }

    const phone = toE164(profile.country, profile.nationalPhone);
    const fields = {
      fullName: profile.fullName,
      gender: profile.gender,
      country: profile.country,
      dateOfBirth: profile.dateOfBirth,
      phone,
    };
    const issue = validateSignUpInput({
      ...fields,
      email: value,
      password,
      confirmPassword,
    });
    if (issue) {
      setError(issueCopy[issue]);
      return;
    }

    setStatus("working");
    try {
      const origin = window.location.origin;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: value,
        password,
        options: {
          emailRedirectTo: `${origin}/account`,
          data: toAuthMetadata(fields),
        },
      });
      if (signUpError) {
        setError(signUpError.message || a.genericError);
        return;
      }
      if (data.user && data.session) {
        await saveProfile(supabase, data.user.id, fields);
        router.push("/account");
        router.refresh();
        return;
      }
      setConfirmSent(value);
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
        {isSignUp ? (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground">{a.accountSection}</p>
          </div>
        ) : null}

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
        {isSignUp ? (
          <div className="space-y-2">
            <Label htmlFor="auth-password-confirm">{a.confirmPasswordLabel}</Label>
            <Input
              id="auth-password-confirm"
              type="password"
              autoComplete="new-password"
              required
              placeholder={a.passwordPlaceholder}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (error) setError(null);
              }}
            />
          </div>
        ) : null}

        {isSignUp ? (
          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground">{a.profileSection}</p>
            <ProfileFields
              idPrefix="signup"
              values={profile}
              onChange={(patch) => {
                setProfile((current) => ({ ...current, ...patch }));
                if (error) setError(null);
              }}
            />
          </div>
        ) : null}

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
