"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductKey } from "@/lib/products";

type WaitlistFormProps = {
  product: ProductKey;
  heading?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function saveLocally(product: ProductKey, value: string) {
  const key = `qvi-waitlist-${product}`;
  let parsed: string[] = [];
  try {
    const current = window.localStorage.getItem(key);
    parsed = current ? (JSON.parse(current) as string[]) : [];
    if (!Array.isArray(parsed)) parsed = [];
  } catch {
    parsed = [];
  }
  if (!parsed.includes(value)) {
    parsed.push(value);
    window.localStorage.setItem(key, JSON.stringify(parsed));
  }
}

export function WaitlistForm({ product, heading }: WaitlistFormProps) {
  const { copy, t } = useI18n();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "done">("idle");
  const productName = product === "qv1" ? copy.products.qv1.name : copy.products.neyora.name;

  useEffect(() => {
    if (user?.email) setEmail((current) => current || (user.email as string));
  }, [user]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setStatus("error");
      return;
    }

    setStatus("saving");

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from("waitlist_signups")
        .insert({ product, email: value, user_id: user?.id ?? null });

      // 23505 = unique violation → the email is already on the list, treat as success.
      if (error && error.code !== "23505") {
        // Backend not reachable or table missing: keep a local copy so the
        // user is never blocked, and still confirm their spot.
        saveLocally(product, value);
      }
    } else {
      saveLocally(product, value);
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

  return (
    <form onSubmit={onSubmit} action="#" className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <Label htmlFor={`${product}-email`} className="text-base font-semibold">
        {heading ?? copy.common.joinWaitlist}
      </Label>
      <p className="text-sm text-muted-foreground">{copy.waitlist.hint}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id={`${product}-email`}
          type="email"
          required
          placeholder={copy.waitlist.placeholder}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status === "error") setStatus("idle");
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
      {status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {copy.waitlist.error}
        </p>
      ) : null}
    </form>
  );
}
