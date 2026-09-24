"use client";

import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copyText } from "@/lib/clipboard";
import { formatHsl, formatRgb, hexToRgb, normalizeHex, rgbToHsl } from "@/lib/color";
import { downloadBlob } from "@/lib/download";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "qvi-recent-colors";
const PALETTE = [
  "#0B1220",
  "#4338CA",
  "#0891B2",
  "#F8FAFC",
  "#818CF8",
  "#E7C9A0",
  "#B91C1C",
  "#047857",
  "#334155",
  "#FFFFFF",
];

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, 12);
  } catch {
    return [];
  }
}

function swatchPng(hex: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("no-context"));
  context.fillStyle = hex;
  context.fillRect(0, 0, 256, 256);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("blob"))), "image/png");
  });
}

export function ColorPicker() {
  const { copy } = useI18n();
  const [hexInput, setHexInput] = useState("#1A7F96");
  const [recent, setRecent] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRecent(readRecent());
  }, []);

  const normalized = useMemo(() => normalizeHex(hexInput), [hexInput]);
  const rgb = normalized ? hexToRgb(normalized) : null;
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;

  function applyHex(next: string, persist = false) {
    setHexInput(next);
    const valid = normalizeHex(next);
    if (!valid) {
      setError(copy.colorPicker.invalid);
      return;
    }
    setError(null);
    setHexInput(valid);
    if (!persist) return;
    setRecent((current) => {
      const nextRecent = [valid, ...current.filter((item) => item !== valid)].slice(0, 12);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecent));
      return nextRecent;
    });
  }

  return (
    <ToolLayout
      hideDropzone
      emptyPreviewText={copy.colorPicker.empty}
      actionLabel={copy.colorPicker.action}
      onAction={() => normalized && void copyText(normalized)}
      actionDisabled={!normalized}
      downloadLabel={copy.colorPicker.download}
      onDownload={async () => {
        if (!normalized) return;
        const blob = await swatchPng(normalized);
        downloadBlob(blob, `${normalized.replace("#", "")}-swatch.png`);
      }}
      downloadDisabled={!normalized}
      error={error}
      leading={
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="color-input">{copy.colorPicker.label}</Label>
              <input
                id="color-input"
                type="color"
                value={normalized ?? "#1A7F96"}
                onChange={(event) => applyHex(event.target.value, true)}
                className="h-14 w-full cursor-pointer rounded-md border border-input bg-transparent p-1 sm:w-24"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="hex-input">{copy.colorPicker.hex}</Label>
              <Input
                id="hex-input"
                dir="ltr"
                value={hexInput}
                onChange={(event) => applyHex(event.target.value)}
                onBlur={() => normalized && applyHex(normalized, true)}
                className="font-mono uppercase"
              />
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">{copy.colorPicker.palette}</p>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={swatch}
                  onClick={() => applyHex(swatch, true)}
                  className={cn(
                    "h-9 w-9 rounded-full border border-border shadow-sm",
                    normalized === swatch && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                  )}
                  style={{ background: swatch }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">{copy.colorPicker.recent}</p>
            {recent.length ? (
              <div className="flex flex-wrap gap-2">
                {recent.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    aria-label={swatch}
                    onClick={() => applyHex(swatch, true)}
                    className="h-9 w-9 rounded-full border border-border"
                    style={{ background: swatch }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{copy.colorPicker.noRecent}</p>
            )}
          </div>
        </div>
      }
      preview={
        rgb && hsl && normalized ? (
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
            <div
              className="mx-auto h-28 w-28 rounded-2xl border shadow-inner"
              style={{ background: normalized }}
              aria-label={copy.colorPicker.alt}
            />
            <div className="space-y-3">
              {[
                { label: copy.colorPicker.hex, value: normalized },
                { label: copy.colorPicker.rgb, value: formatRgb(rgb) },
                { label: copy.colorPicker.hsl, value: formatHsl(hsl) },
              ].map((row) => (
                <div key={row.label} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <p className="font-mono text-sm font-semibold" dir="ltr">
                      {row.value}
                    </p>
                  </div>
                  <CopyButton value={row.value} />
                </div>
              ))}
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
