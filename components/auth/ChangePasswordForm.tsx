"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { PasswordField } from "@/components/auth/PasswordField";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { MIN_PASSWORD_LENGTH, validatePasswordPair } from "@/lib/auth/profile";
import {
  clearPasswordRecovery,
  isInvalidCredentialsError,
  isRateLimitError,
  isSessionMissingError,
} from "@/lib/auth/recovery";
import { getSupabaseClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const { user } = useAuth();
  const { copy } = useI18n();
  const a = copy.auth;
  const email = user?.email ?? "";

  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  if (!email) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    setError(null);
    setSaved(null);

    if (!currentPassword) {
      setError(a.currentPasswordRequired);
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
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthError) {
        if (isInvalidCredentialsError(reauthError)) setError(a.wrongCurrentPassword);
        else if (isRateLimitError(reauthError)) setError(a.forgotRateLimit);
        else setError(reauthError.message || a.genericError);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        if (isSessionMissingError(updateError)) setError(a.genericError);
        else if (isRateLimitError(updateError)) setError(a.forgotRateLimit);
        else setError(updateError.message || a.genericError);
        return;
      }

      const { error: othersError } = await supabase.auth.signOut({ scope: "others" });
      clearPasswordRecovery();
      setSaved(othersError ? a.passwordUpdated : a.passwordUpdatedSessions);
      setOpen(false);
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setTouched(false);
    } catch {
      setError(a.genericError);
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h2 className="text-sm font-semibold">{a.changePasswordTitle}</h2>
      {saved ? (
        <p className="text-sm text-primary" role="status">
          {saved}
        </p>
      ) : null}
      {open ? (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <p className="text-sm text-muted-foreground">{a.changePasswordLead}</p>
          <PasswordField
            id="account-current-password"
            label={a.currentPasswordLabel}
            value={currentPassword}
            placeholder={a.currentPasswordPlaceholder}
            autoComplete="current-password"
            error={touched && !currentPassword ? a.currentPasswordRequired : undefined}
            onBlur={() => setTouched(true)}
            onChange={(value) => {
              setCurrentPassword(value);
              if (error) setError(null);
            }}
          />
          <PasswordField
            id="account-new-password"
            label={a.newPasswordLabel}
            value={password}
            placeholder={a.passwordPlaceholder}
            autoComplete="new-password"
            showStrength
            error={touched && password.length < MIN_PASSWORD_LENGTH ? a.shortPassword : undefined}
            onBlur={() => setTouched(true)}
            onChange={(value) => {
              setPassword(value);
              if (error) setError(null);
            }}
          />
          <PasswordField
            id="account-confirm-password"
            label={a.confirmPasswordLabel}
            value={confirmPassword}
            placeholder={a.confirmPasswordPlaceholder}
            autoComplete="new-password"
            error={touched && confirmPassword && confirmPassword !== password ? a.passwordMismatch : undefined}
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" className="flex-1" disabled={status === "working"}>
              {status === "working" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {a.working}
                </>
              ) : (
                a.updatePassword
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setOpen(false);
                setError(null);
                setTouched(false);
                setCurrentPassword("");
                setPassword("");
                setConfirmPassword("");
              }}
            >
              {a.cancelEdit}
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          {a.changePassword}
        </Button>
      )}
    </div>
  );
}
