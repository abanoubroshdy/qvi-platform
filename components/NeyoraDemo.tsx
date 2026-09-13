"use client";

import { useState, type FormEvent } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function NeyoraDemo() {
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value) {
      setMessage("Write a short performance prompt first.");
      return;
    }
    window.localStorage.setItem("qvi-neyora-last-prompt", value);
    setMessage("Prompt stored on this device. The DDSP engine is still in the lab — synthesis is not live yet.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6 glow-violet">
      <div>
        <Label htmlFor="neyora-prompt" className="text-base font-semibold">
          Text prompt → instrument
        </Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe a phrase. Neyora will turn language, voice, or MIDI into a physically informed
          performance when the lab engine ships.
        </p>
      </div>
      <textarea
        id="neyora-prompt"
        rows={4}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="A slow ney phrase in maqam rast, breathy attack, ornamental slides"
        className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
      />
      <div className="flex h-24 items-end justify-center gap-1 rounded-xl border border-dashed border-white/15 bg-black/40 px-4">
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
        Render preview
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
