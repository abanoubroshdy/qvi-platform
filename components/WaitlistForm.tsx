"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductKey } from "@/lib/products";

type WaitlistFormProps = {
  product: ProductKey;
  heading?: string;
};

export function WaitlistForm({ product, heading = "Join the waitlist" }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "error" | "done">("idle");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus("error");
      return;
    }

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

    setSavedEmail(value);
    setStatus("done");
    setEmail("");
  }

  if (status === "done") {
    return (
      <div
        className="space-y-2 rounded-2xl border border-primary/40 bg-primary/10 p-5"
        role="status"
        aria-live="polite"
      >
        <p className="inline-flex items-center gap-2 text-base font-semibold text-primary">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          You are on the {product === "qv1" ? "QV1" : "Neyora"} waitlist
        </p>
        <p className="text-sm leading-7 text-muted-foreground">
          Saved on this device{savedEmail ? ` for ${savedEmail}` : ""}. We will notify you when the
          instrument is ready. Cloud waitlist comes next.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} action="#" className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-5">
      <Label htmlFor={`${product}-email`} className="text-base font-semibold">
        {heading}
      </Label>
      <p className="text-sm text-muted-foreground">
        Leave your email and we will notify you when this instrument is ready. Saved on this device
        for now — cloud waitlist comes next.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id={`${product}-email`}
          type="email"
          required
          placeholder="you@studio.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status === "error") setStatus("idle");
          }}
          className="bg-background/60"
        />
        <Button type="submit" size="lg">
          Join waitlist
        </Button>
      </div>
      {status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          Enter a valid email address.
        </p>
      ) : null}
    </form>
  );
}
