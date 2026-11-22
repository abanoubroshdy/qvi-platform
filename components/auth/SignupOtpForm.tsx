"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { saveProfile } from "@/lib/supabase/profile";
import type { ProfileFields } from "@/lib/auth/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RESEND_COOLDOWN_SEC = 60;

export function SignupOtpForm({
  email,
  destination,
  profileFields,
}: {
  email: string;
  destination: string;
  profileFields: ProfileFields;
}) {
  const { copy, t } = useI18n();
  const router = useRouter();
  const a = copy.auth;

  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "resending">("idle");
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SEC);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  const onResend = useCallback(async () => {
    if (resendIn > 0) return;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError(a.notConfigured);
      return;
    }
    setStatus("resending");
    setError(null);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
      if (resendError) {
        setError(a.otpResendFailed);
      } else {
        setResendIn(RESEND_COOLDOWN_SEC);
      }
    } catch {
      setError(a.otpResendFailed);
    } finally {
      setStatus("idle");
    }
  }, [a.notConfigured, a.otpResendFailed, email, resendIn]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      setError(a.otpInvalid);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError(a.notConfigured);
      return;
    }

    setStatus("working");
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      });
      if (verifyError || !data.session) {
        setError(a.otpInvalid);
        return;
      }
      await saveProfile(supabase, data.user?.id ?? data.session.user.id, profileFields);
      router.push(destination);
      router.refresh();
    } catch {
      setError(a.genericError);
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{a.otpTitle}</h1>
        <p className="text-sm leading-7 text-muted-foreground">{t(a.otpLead, { email })}</p>
        <p className="text-xs text-muted-foreground">{a.otpLinkFallback}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="signup-otp" className="text-sm font-semibold">
            {a.otpCodeLabel}
          </Label>
          <Input
            id="signup-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            value={code}
            dir="ltr"
            className="h-11 bg-background text-center text-lg tracking-[0.35em] text-foreground"
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              if (error) setError(null);
            }}
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={status !== "idle"}>
          {status === "working" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {a.working}
            </>
          ) : (
            a.otpConfirmCta
          )}
        </Button>
      </form>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
          disabled={resendIn > 0 || status === "resending"}
          onClick={() => void onResend()}
        >
          {status === "resending" ? a.working : resendIn > 0 ? t(a.otpResendWait, { seconds: resendIn }) : a.otpResendCta}
        </button>
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          {a.backToSignIn}
        </Link>
      </div>
    </div>
  );
}