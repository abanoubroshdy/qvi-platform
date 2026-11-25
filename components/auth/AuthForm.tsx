"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LocaleLink as Link } from "@/components/LocaleLink";
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
  validateSignIn,
  validateSignUpInput,
  type ProfileIssue,
} from "@/lib/auth/profile";
import { signupEmailIssue } from "@/lib/auth/disposable-domains";
import { SignupOtpForm } from "@/components/auth/SignupOtpForm";
import {
  TurnstileWidget,
  turnstileEnabledOnClient,
  type TurnstileWidgetHandle,
} from "@/components/auth/TurnstileWidget";
import { detectCountryFromLocale, isCountryCode } from "@/lib/geo/countries";
import { safeNextPath } from "@/lib/safe-next-path";

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

export function AuthForm({
  initialMode = "signin",
  nextPath = "/account",
  serverEnforcesTurnstile = false,
}: {
  initialMode?: Mode;
  nextPath?: string;
  serverEnforcesTurnstile?: boolean;
}) {
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
  const [pendingOtpEmail, setPendingOtpEmail] = useState<string | null>(null);
  const [otpProfileFields, setOtpProfileFields] = useState<{
    fullName: string;
    country: string;
    ageConfirmed: boolean;
    privacyConsent: boolean;
    marketingConsent: boolean;
  } | null>(null);
  const [emailDomainError, setEmailDomainError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const countryTouched = useRef(false);

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);
  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
  }, []);
  const releaseTurnstileAfterAttempt = useCallback(() => {
    setTurnstileToken("");
    turnstileRef.current?.reset();
  }, []);

  const a = copy.auth;
  const isSignUp = mode === "signup";
  const destination = safeNextPath(nextPath);
  const turnstileRequired = turnstileEnabledOnClient();

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
    ? Boolean(configured) &&
      !loading &&
      signupIssue === null &&
      !emailDomainError &&
      (!turnstileRequired || Boolean(turnstileToken))
    : Boolean(configured) &&
      !loading &&
      validateSignIn(email.trim().toLowerCase(), password) === null &&
      (!turnstileRequired || Boolean(turnstileToken));

  function markTouched(field: string) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function messageFor(issue: ProfileIssue | null, field: string) {
    if (!touched[field] || !issue) return undefined;
    return issueCopy[issue];
  }

  function refreshEmailDomainHint(value: string) {
    if (!isSignUp) {
      setEmailDomainError(null);
      return;
    }
    const issue = signupEmailIssue(value.trim().toLowerCase());
    if (!issue || issue.ok) {
      setEmailDomainError(null);
      return;
    }
    if (issue.code === "disposable_email") {
      setEmailDomainError(a.disposableEmail);
      return;
    }
    setEmailDomainError(t(a.emailTypo, { suggestion: issue.suggestion }));
  }

  function signupApiErrorMessage(payload: {
    error?: string;
    suggestion?: string;
    issue?: ProfileIssue;
    reason?: string;
  }): string {
    if (payload.error === "disposable_email") return a.disposableEmail;
    if (payload.error === "email_typo" && payload.suggestion) {
      return t(a.emailTypo, { suggestion: payload.suggestion });
    }
    if (payload.error === "turnstile") return a.turnstileFailed;
    if (payload.error === "validation" && payload.issue) return issueCopy[payload.issue] ?? a.genericError;
    if (payload.error === "not_configured") return a.notConfigured;
    return a.genericError;
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
      if (turnstileRequired && !turnstileToken) {
        setError(a.turnstileFailed);
        return;
      }

      setStatus("working");
      try {
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: value,
            password,
            turnstileToken: turnstileToken || undefined,
          }),
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
          issue?: ProfileIssue;
          reason?: string;
          session?: { access_token: string; refresh_token: string };
          message?: string;
        };
        if (!response.ok || !payload.ok || !payload.session) {
          setError(
            payload.message ||
              signupApiErrorMessage(payload) ||
              a.genericError,
          );
          return;
        }
        const { error: sessionError } = await supabase.auth.setSession(payload.session);
        if (sessionError) {
          setError(sessionError.message || a.genericError);
          return;
        }
        router.push(destination);
        router.refresh();
      } catch {
        setError(a.genericError);
      } finally {
        setStatus("idle");
        releaseTurnstileAfterAttempt();
      }
      return;
    }

    const issue = validateSignUpInput(signupFields);
    if (issue) {
      setError(issueCopy[issue]);
      return;
    }
    const domainIssue = signupEmailIssue(value);
    if (domainIssue && !domainIssue.ok) {
      setError(
        domainIssue.code === "disposable_email"
          ? a.disposableEmail
          : t(a.emailTypo, { suggestion: domainIssue.suggestion }),
      );
      return;
    }
    if (turnstileRequired && !turnstileToken) {
      setError(a.turnstileFailed);
      return;
    }

    setStatus("working");
    try {
      const fields = {
        fullName: signupFields.fullName,
        country: signupFields.country,
        ageConfirmed: true,
        privacyConsent: true,
        marketingConsent: agreedToMarketing,
      };
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...signupFields,
          turnstileToken: turnstileToken || undefined,
          nextPath: destination,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        issue?: ProfileIssue;
        suggestion?: string;
        confirmed?: boolean;
        email?: string;
        session?: { access_token: string; refresh_token: string };
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.message || signupApiErrorMessage(payload));
        return;
      }
      if (payload.confirmed && payload.session) {
        const { error: sessionError } = await supabase.auth.setSession(payload.session);
        if (sessionError) {
          setError(sessionError.message || a.genericError);
          return;
        }
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user?.id) {
          await saveProfile(supabase, userData.user.id, fields);
        }
        router.push(destination);
        router.refresh();
        return;
      }
      setOtpProfileFields(fields);
      setPendingOtpEmail(payload.email ?? value);
    } catch {
      setError(a.genericError);
    } finally {
      setStatus("idle");
      releaseTurnstileAfterAttempt();
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
          onBlur={() => {
            markTouched("email");
            refreshEmailDomainHint(email);
          }}
          onChange={(event) => {
            setEmail(event.target.value);
            if (error) setError(null);
            if (emailDomainError) refreshEmailDomainHint(event.target.value);
          }}
          className="h-11 bg-background text-foreground placeholder:text-muted-foreground/80"
        />
        {messageFor(isValidEmail(email.trim()) ? null : "email", "email") ? (
          <p className="text-xs text-destructive" role="alert">
            {a.invalidEmail}
          </p>
        ) : null}
        {emailDomainError ? (
          <p className="text-xs text-destructive" role="alert">
            {emailDomainError}
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

      {!isSignUp ? (
        <p className="text-end text-sm">
          <Link href="/forgot-password" className="font-semibold text-primary underline-offset-4 hover:underline">
            {a.forgotPassword}
          </Link>
        </p>
      ) : null}

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

  if (pendingOtpEmail && otpProfileFields) {
    return (
      <SignupOtpForm email={pendingOtpEmail} destination={destination} profileFields={otpProfileFields} />
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

        <TurnstileWidget
          ref={turnstileRef}
          className="pt-1"
          action={isSignUp ? "signup" : "signin"}
          onToken={handleTurnstileToken}
          onExpire={handleTurnstileExpire}
          serverEnforcesTurnstile={serverEnforcesTurnstile}
        />

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full text-base"
          disabled={status === "working" || loading || !configured || !canSubmit}
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
            releaseTurnstileAfterAttempt();
            setPendingOtpEmail(null);
            setOtpProfileFields(null);
            setEmailDomainError(null);
          }}
        >
          {isSignUp ? a.switchToSignIn : a.switchToSignUp}
        </button>
      </p>
    </div>
  );
}
