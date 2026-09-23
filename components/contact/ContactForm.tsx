"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteConfig } from "@/lib/site";

type FormStatus = "idle" | "submitting" | "validation_error" | "success" | "server_error";

export function ContactForm() {
  const { copy } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus("validation_error");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          website,
        }),
      });

      if (response.ok) {
        setStatus("success");
        setName("");
        setEmail("");
        setMessage("");
        setWebsite("");
        return;
      }

      setStatus("server_error");
    } catch {
      setStatus("server_error");
    }
  }

  const isSubmitting = status === "submitting";

  return (
    <form onSubmit={onSubmit} className="relative space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{copy.contactForm.name}</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{copy.contactForm.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">{copy.contactForm.message}</Label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={isSubmitting}
          className="flex min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
        />
      </div>

      {status === "validation_error" ? (
        <p className="text-sm text-destructive" role="alert">
          {copy.contactForm.error}
        </p>
      ) : null}
      {status === "success" ? (
        <p className="text-sm text-primary" role="status">
          {copy.contactForm.success}
        </p>
      ) : null}
      {status === "server_error" ? (
        <p className="text-sm text-destructive" role="alert">
          {copy.contactForm.serverError}{" "}
          <a className="font-semibold underline" href={`mailto:${siteConfig.supportEmail}`}>
            {siteConfig.supportEmail}
          </a>
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
        {isSubmitting ? copy.contactForm.sending : copy.contactForm.send}
      </Button>
    </form>
  );
}
