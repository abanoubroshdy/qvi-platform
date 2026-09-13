"use client";

import { useState, type FormEvent } from "react";
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
  const [status, setStatus] = useState<"idle" | "error" | "done">("idle");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    setStatus("done");
    setEmail("");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-5">
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
            if (status !== "idle") setStatus("idle");
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
      {status === "done" ? (
        <p className="text-sm text-primary">You are on the list. We will be in touch.</p>
      ) : null}
    </form>
  );
}
