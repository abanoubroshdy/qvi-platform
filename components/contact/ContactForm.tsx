"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteConfig } from "@/lib/site";

export function ContactForm() {
  const { copy } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "ready">("idle");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus("error");
      return;
    }

    const subject = encodeURIComponent(`Message from ${name} via QVI`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:${siteConfig.email}?subject=${subject}&body=${body}`;
    setStatus("ready");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="name">{copy.contactForm.name}</Label>
        <Input id="name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
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
          className="flex min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      {status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {copy.contactForm.error}
        </p>
      ) : null}
      {status === "ready" ? <p className="text-sm text-primary">{copy.contactForm.ready}</p> : null}
      <Button type="submit" size="lg" className="w-full sm:w-auto">
        <Send />
        {copy.contactForm.send}
      </Button>
    </form>
  );
}
