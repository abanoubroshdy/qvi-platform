"use client";

import { useState, type FormEvent } from "react";
import { Play } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function NeyoraDemo() {
  const { copy } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value) {
      setMessage(copy.demo.empty);
      return;
    }
    window.localStorage.setItem("qvi-neyora-last-prompt", value);
    setMessage(copy.demo.stored);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-border bg-card p-6 glow-violet">
      <div>
        <Label htmlFor="neyora-prompt" className="text-base font-semibold">
          {copy.demo.label}
        </Label>
        <p className="mt-1 text-sm text-muted-foreground">{copy.demo.hint}</p>
      </div>
      <textarea
        id="neyora-prompt"
        rows={4}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder={copy.demo.placeholder}
        className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
      />
      <div className="flex h-24 items-end justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/40 px-4">
        {Array.from({ length: 28 }, (_, index) => (
          <span
            key={index}
            className="wave-bar w-1 rounded-full bg-accent/80"
            style={{ height: `${18 + ((index * 13) % 42)}px`, animationDelay: `${index * 0.04}s` }}
          />
        ))}
      </div>
      <Button type="submit" size="lg">
        <Play />
        {copy.demo.render}
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
