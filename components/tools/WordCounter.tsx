"use client";

import { useMemo, useState } from "react";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Label } from "@/components/ui/label";
import { copyText } from "@/lib/clipboard";

function countText(value: string) {
  const trimmed = value.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const characters = value.length;
  const charactersNoSpaces = value.replace(/\s/g, "").length;
  const sentences = value
    .split(/[.!?؟…]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
  const paragraphs = value
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
  const readingMinutes = words === 0 ? 0 : Math.max(1, Math.ceil(words / 200));
  return { words, characters, charactersNoSpaces, sentences, paragraphs, readingMinutes };
}

export function WordCounter() {
  const { copy, t } = useI18n();
  const [text, setText] = useState("");
  const stats = useMemo(() => countText(text), [text]);

  const summary = [
    `${copy.wordCounter.words}: ${stats.words}`,
    `${copy.wordCounter.characters}: ${stats.characters}`,
    `${copy.wordCounter.charactersNoSpaces}: ${stats.charactersNoSpaces}`,
    `${copy.wordCounter.sentences}: ${stats.sentences}`,
    `${copy.wordCounter.paragraphs}: ${stats.paragraphs}`,
    `${copy.wordCounter.reading}: ${t(copy.wordCounter.minutes, { count: stats.readingMinutes })}`,
  ].join("\n");

  return (
    <ToolLayout
      hideDropzone
      emptyPreviewText={copy.wordCounter.empty}
      actionLabel={copy.wordCounter.action}
      onAction={() => void copyText(summary)}
      actionDisabled={!text}
      downloadLabel={copy.wordCounter.download}
      onDownload={() => text && void copyText(text)}
      downloadDisabled={!text}
      leading={
        <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
          <Label htmlFor="word-counter-text">{copy.wordCounter.label}</Label>
          <textarea
            id="word-counter-text"
            rows={12}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={copy.wordCounter.placeholder}
            className="flex min-h-[240px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base leading-8 shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            dir="auto"
          />
        </div>
      }
      preview={
        text ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label={copy.wordCounter.words} value={`${stats.words}`} />
            <Stat label={copy.wordCounter.characters} value={`${stats.characters}`} />
            <Stat label={copy.wordCounter.charactersNoSpaces} value={`${stats.charactersNoSpaces}`} />
            <Stat label={copy.wordCounter.sentences} value={`${stats.sentences}`} />
            <Stat label={copy.wordCounter.paragraphs} value={`${stats.paragraphs}`} />
            <Stat label={copy.wordCounter.reading} value={t(copy.wordCounter.minutes, { count: stats.readingMinutes })} />
          </div>
        ) : undefined
      }
    />
  );
}
