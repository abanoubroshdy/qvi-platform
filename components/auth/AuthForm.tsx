"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { ConsentFields } from "@/components/auth/ConsentFields";
import { PasswordField } from "@/components/auth/PasswordField";
import { ProfileFields, type ProfileFormValues } from "@/components/auth/ProfileFields";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { saveProfile } from "@/lib/supabase/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isValidEmail,
  isValidFullName,
  toAuthMetadata,
  validateSignIn,
  validateSignUpInput,
  type ProfileIssue,
} from "@/lib/auth/profile";
import { detectCountryFromLocale, isCountryCode } from "@/lib/geo/countries";

type Mode = "signin" | "signup";

function emptyProfile(locale: string, language: string): ProfileFormValues {
  return {
    fullName: "",
    country: detectCountryFromLocale(locale, language),
  };
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-background/55 p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function AuthForm({ initialMode = "signin" }: { initialMode?: Mode }) {
  const { copy, t, locale } = useI18n();
  const { configured, loading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profile, setProfile] = useState<ProfileFormValues>(() =>
    emptyProfile(locale, typeof navigator === "undefined" ? locale : navigator.language),
  );
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToMarketing, setAgreedToMarketing] = useState(false);
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const countryTouched = useRef(false);

  const a = copy.auth;
  const isSignUp = mode === "signup";

  const issueCopy = useMemo<Record<ProfileIssue, string>>(
    () => ({
      email: a.invalidEmail,
      password: a.shortPassword,
      passwordMismatch: a.passwordMismatch,
      fullName: a.invalidName,
      country: a.invalidCountry,
      ageConfirm: a.ageRequired,
      privacyConsent: a.privacyRequired,
    }),
    [a],
  );

  useEffect(() => {
    if (!isSignUp) return;
    let cancelled = false;
    fetch("/api/geo", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ country?: string | null }>)
      .then((data) => {
        if (cancelled || countryTouched.current) return;
        const country = data.country?.toUpperCase();
        if (!country || !isCountryCode(country)) return;
        setProfile((current) => ({ ...current, country }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isSignUp]);

  const signupFields = useMemo(() => {
    return {
      fullName: profile.fullName,
      country: profile.country,
      email: email.trim().toLowerCase(),
      password,
      confirmPassword,
      ageConfirmed,
      privacyConsent: agreedToPrivacy,
      marketingConsent: agreedToMarketing,
    };
  }, [ageConfirmed, agreedToMarketing, agreedToPrivacy, confirmPassword, email, password, profile]);

  const signupIssue = isSignUp ? validateSignUpInput(signupFields) : null;
  const canSubmit = isSignUp
    ? Boolean(configured) && !loading && signupIssue === null
    : Boolean(configured) && !loading && validateSignIn(email.trim().toLowerCase(), password) === null;

  function markTouched(field: string) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function messageFor(issue: ProfileIssue | null, field: string) {
    if (!touched[field] || !issue) return undefined;
    return issueCopy[issue];
  }

  const profileErrors = {
    fullName: touched.fullName && !isValidFullName(profile.fullName) ? issueCopy.fullName : undefined,
    country: touched.country && !isCountryCode(profile.country) ? issueCopy.country : undefined,
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setTouched({
      fullName: true,
      country: true,
      email: true,
      password: true,
      confirmPassword: true,
      age: true,
      privacy: true,
    });

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

    const issue = validateSignUpInput(signupFields);
    if (issue) {
      setError(issueCopy[issue]);
      return;
    }

    setStatus("working");
    try {
      const origin = window.location.origin;
      const fields = {
        fullName: signupFields.fullName,
        country: signupFields.country,
        ageConfirmed: true,
        privacyConsent: true,
        marketingConsent: agreedToMarketing,
      };
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: value,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: {
            ...toAuthMetadata(fields),
            privacy_consent: true,
            marketing_consent: agreedToMarketing,
          },
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

  const credentialFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="auth-email" className="text-sm font-semibold">
          {a.emailLabel}
          <span className="ms-1 text-destructive">*</span>
        </Label>
        <Input
          id="auth-email"
          type="email"
          autoComplete="email"
          required
          placeholder={a.emailPlaceholder}
          value={email}
          aria-invalid={Boolean(messageFor(isValidEmail(email.trim()) ? null : "email", "email"))}
          onBlur={() => markTouched("email")}
          onChange={(event) => {
            setEmail(event.target.value);
            if (error) setError(null);
          }}
          className="h-11 bg-background text-foreground placeholder:text-muted-foreground/80"
        />
        {messageFor(isValidEmail(email.trim()) ? null : "email", "email") ? (
          <p className="text-xs text-destructive" role="alert">
            {a.invalidEmail}
          </p>
        ) : null}
      </div>

      <PasswordField
        id="auth-password"
        label={a.passwordLabel}
        value={password}
        placeholder={a.passwordPlaceholder}
        autoComplete={isSignUp ? "new-password" : "current-password"}
        showStrength={isSignUp}
        error={touched.password && password.length < 6 ? a.shortPassword : undefined}
        onBlur={() => markTouched("password")}
        onChange={(value) => {
          setPassword(value);
          if (error) setError(null);
        }}
      />

      {isSignUp ? (
        <PasswordField
          id="auth-password-confirm"
          label={a.confirmPasswordLabel}
          value={confirmPassword}
          placeholder={a.confirmPasswordPlaceholder}
          autoComplete="new-password"
          error={
            touched.confirmPassword && confirmPassword && confirmPassword !== password
              ? a.passwordMismatch
              : undefined
          }
          onBlur={() => markTouched("confirmPassword")}
          onChange={(value) => {
            setConfirmPassword(value);
            if (error) setError(null);
          }}
        />
      ) : null}
    </>
  );

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
    <div className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{isSignUp ? a.signUpTitle : a.signInTitle}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{isSignUp ? a.signUpLead : a.signInLead}</p>
      </div>

      {!loading && !configured ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground" role="alert">
          {a.notConfigured}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4" noValidate={isSignUp}>
        {isSignUp ? (
          <FormSection title={a.profileSection}>
            <ProfileFields
              idPrefix="signup"
              values={profile}
              errors={profileErrors}
              onBlurField={(field) => {
                if (field === "country") countryTouched.current = true;
                markTouched(field);
              }}
              onChange={(patch) => {
                if (patch.country !== undefined) countryTouched.current = true;
                setProfile((current) => ({ ...current, ...patch }));
                if (error) setError(null);
              }}
            />
          </FormSection>
        ) : null}

        {isSignUp ? (
          <FormSection title={a.accountSection}>
            {credentialFields}
          </FormSection>
        ) : (
          <div className="space-y-4">{credentialFields}</div>
        )}

        {isSignUp ? (
          <FormSection title={a.consentSection}>
            <ConsentFields
              ageConfirmed={ageConfirmed}
              agreedToPrivacy={agreedToPrivacy}
              agreedToMarketing={agreedToMarketing}
              ageError={touched.age && !ageConfirmed ? a.ageRequired : undefined}
              privacyError={touched.privacy && !agreedToPrivacy ? a.privacyRequired : undefined}
              onAgeChange={(value) => {
                setAgeConfirmed(value);
                markTouched("age");
                if (error) setError(null);
              }}
              onPrivacyChange={(value) => {
                setAgreedToPrivacy(value);
                markTouched("privacy");
                if (error) setError(null);
              }}
              onMarketingChange={setAgreedToMarketing}
            />
          </FormSection>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full text-base"
          disabled={status === "working" || loading || !configured || (!isSignUp && !canSubmit)}
        >
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
            setTouched({});
            setAgeConfirmed(false);
            setAgreedToPrivacy(false);
            setAgreedToMarketing(false);
          }}
        >
          {isSignUp ? a.switchToSignIn : a.switchToSignUp}
        </button>
      </p>
    </div>
  );
}
