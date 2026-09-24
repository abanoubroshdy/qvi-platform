"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CONTACT_LIMITS,
  validateContactFields,
  type ContactField,
  type ContactFieldIssue,
} from "@/lib/contact";
import { siteConfig } from "@/lib/site";

type FormStatus = "idle" | "submitting" | "success" | "server_error";

export function ContactForm() {
  const { copy, t } = useI18n();
  const c = copy.contactForm;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errors, setErrors] = useState<Partial<Record<ContactField, ContactFieldIssue>>>({});
  const [serverCode, setServerCode] = useState<string | null>(null);

  function clearField(field: ContactField) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (status === "server_error") {
      setStatus("idle");
      setServerCode(null);
    }
  }

  function messageFor(issue: ContactFieldIssue | undefined, field: ContactField): string | undefined {
    if (!issue) return undefined;
    if (field === "name" && issue === "required") return c.nameRequired;
    if (field === "name" && issue === "too_long") return t(c.nameTooLong, { max: CONTACT_LIMITS.name });
    if (field === "email" && issue === "required") return c.emailRequired;
    if (field === "email") return c.emailInvalid;
    if (issue === "required") return c.messageRequired;
    if (issue === "too_short") return t(c.messageTooShort, { min: CONTACT_LIMITS.messageMin });
    return t(c.messageTooLong, { max: CONTACT_LIMITS.message });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = validateContactFields({ name, email, message });
    setErrors(fieldErrors);
    setServerCode(null);
    if (Object.keys(fieldErrors).length > 0) {
      setStatus("idle");
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

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (response.ok && payload?.ok === true) {
        setStatus("success");
        setName("");
        setEmail("");
        setMessage("");
        setWebsite("");
        setErrors({});
        return;
      }

      setServerCode(typeof payload?.error === "string" ? payload.error : "provider_error");
      setStatus("server_error");
    } catch {
      setServerCode("provider_error");
      setStatus("server_error");
    }
  }

  if (status === "success") {
    return (
      <div
        className="space-y-3 rounded-xl border border-primary/30 bg-primary/10 p-5 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <p className="inline-flex items-center gap-2 text-base font-semibold text-primary">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          {c.successTitle}
        </p>
        <p className="text-sm leading-7 text-muted-foreground">{c.success}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setStatus("idle");
            setServerCode(null);
          }}
        >
          {c.sendAnother}
        </Button>
      </div>
    );
  }

  const isSubmitting = status === "submitting";
  const nameError = messageFor(errors.name, "name");
  const emailError = messageFor(errors.email, "email");
  const messageError = messageFor(errors.message, "message");

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
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
        <Label htmlFor="name">{c.name}</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            clearField("name");
          }}
          autoComplete="name"
          maxLength={CONTACT_LIMITS.name}
          required
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? "name-error" : undefined}
          disabled={isSubmitting}
        />
        {nameError ? (
          <p id="name-error" className="text-sm text-destructive" role="alert">
            {nameError}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{c.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearField("email");
          }}
          autoComplete="email"
          maxLength={CONTACT_LIMITS.email}
          required
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "email-error" : undefined}
          disabled={isSubmitting}
        />
        {emailError ? (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {emailError}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">{c.message}</Label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          maxLength={CONTACT_LIMITS.message}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            clearField("message");
          }}
          aria-invalid={Boolean(messageError)}
          aria-describedby={messageError ? "message-error" : "message-hint"}
          disabled={isSubmitting}
          className="flex min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
        />
        <p id="message-hint" className="text-xs text-muted-foreground">
          {t(c.messageHint, { min: CONTACT_LIMITS.messageMin, max: CONTACT_LIMITS.message })}
        </p>
        {messageError ? (
          <p id="message-error" className="text-sm text-destructive" role="alert">
            {messageError}
          </p>
        ) : null}
      </div>

      {status === "server_error" ? (
        <p className="text-sm text-destructive" role="alert">
          {serverCode === "too_short"
            ? t(c.messageTooShort, { min: CONTACT_LIMITS.messageMin })
            : serverCode === "too_long"
              ? t(c.messageTooLong, { max: CONTACT_LIMITS.message })
              : serverCode === "invalid_email"
                ? c.emailInvalid
                : serverCode === "missing_fields"
                  ? c.error
                  : null}{" "}
          {serverCode === "not_configured" || serverCode === "provider_error" || !serverCode ? (
            <>
              {c.serverError}{" "}
              <a className="font-semibold underline" href={`mailto:${siteConfig.supportEmail}`}>
                {siteConfig.supportEmail}
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
        {isSubmitting ? c.sending : c.send}
      </Button>
    </form>
  );
}
