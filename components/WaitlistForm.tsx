"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  normalizeWaitlistEmail,
  validateWaitlistEmail,
  waitlistSubmitResult,
  type WaitlistEmailIssue,
} from "@/lib/waitlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductKey } from "@/lib/products";

type WaitlistFormProps = {
  product: ProductKey;
  heading?: string;
};

type WaitlistStatus = "idle" | "saving" | "invalid" | "failed" | "done";

export function WaitlistForm({ product, heading }: WaitlistFormProps) {
  const { copy, t } = useI18n();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [issue, setIssue] = useState<WaitlistEmailIssue | null>(null);
  const [status, setStatus] = useState<WaitlistStatus>("idle");
  const productName = product === "qv1" ? copy.products.qv1.name : copy.products.neyora.name;
  const inputId = `${product}-email`;
  const errorId = `${product}-email-error`;

  useEffect(() => {
    if (user?.email) setEmail((current) => current || (user.email as string));
  }, [user]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const fieldIssue = validateWaitlistEmail(email);
    if (fieldIssue) {
      setIssue(fieldIssue);
      setStatus("invalid");
      return;
    }

    const value = normalizeWaitlistEmail(email);
    setIssue(null);
    setStatus("saving");

    const supabase = getSupabaseClient();
    const { error } = supabase
      ? await supabase.from("waitlist_signups").insert({ product, email: value, user_id: user?.id ?? null })
      : { error: null };

    // 23505 = unique violation → the email is already on the list, which is a real success.
    if (waitlistSubmitResult({ configured: Boolean(supabase), errorCode: error?.code }) === "failed") {
      setStatus("failed");
      return;
    }

    setSavedEmail(value);
    setStatus("done");
    setEmail("");
  }

  if (status === "done") {
    return (
      <div
        className="space-y-2 rounded-2xl border border-primary/30 bg-primary/10 p-5"
        role="status"
        aria-live="polite"
      >
        <p className="inline-flex items-center gap-2 text-base font-semibold text-primary">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          {t(copy.waitlist.doneTitle, { product: productName })}
        </p>
        <p className="text-sm leading-7 text-muted-foreground">
          {t(copy.waitlist.doneBody, {
            email: savedEmail ? t(copy.waitlist.forEmail, { email: savedEmail }) : "",
          })}
        </p>
      </div>
    );
  }

  const fieldMessage =
    issue === "required" ? copy.waitlist.required : issue === "invalid" ? copy.waitlist.error : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <Label htmlFor={inputId} className="text-base font-semibold">
        {heading ?? copy.common.joinWaitlist}
      </Label>
      <p className="text-sm text-muted-foreground">{copy.waitlist.hint}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id={inputId}
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(fieldMessage)}
          aria-describedby={fieldMessage ? errorId : undefined}
          placeholder={copy.waitlist.placeholder}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (issue) setIssue(null);
            if (status === "invalid" || status === "failed") setStatus("idle");
          }}
          className="bg-background/60"
        />
        <Button type="submit" size="lg" disabled={status === "saving"}>
          {status === "saving" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {copy.waitlist.saving}
            </>
          ) : (
            copy.waitlist.submit
          )}
        </Button>
      </div>
      {fieldMessage ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {fieldMessage}
        </p>
      ) : null}
      {status === "failed" ? (
        <p className="text-sm text-destructive" role="alert">
          {copy.waitlist.failed}
        </p>
      ) : null}
    </form>
  );
}
