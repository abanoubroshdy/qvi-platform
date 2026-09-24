"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  clampStudioNumber,
  formatStudioControlValue,
  parsePanInput,
  parseStudioNumber,
} from "@/lib/studio/control-value";

type StudioSliderFieldProps = {
  label: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
  digits?: number;
  /** Shown after the number, e.g. dB. */
  unit?: string;
  /** Optional display override in the input (e.g. pan label). */
  displayValue?: string;
  /** When set, parses the number field with pan rules instead of plain float. */
  parse?: "number" | "pan";
  ariaLabel?: string;
  resetHint?: string;
  onChange: (value: number) => void;
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
};

export function StudioSliderField({
  label,
  value,
  defaultValue,
  min,
  max,
  step = 0.1,
  digits = 1,
  unit,
  displayValue,
  parse = "number",
  ariaLabel,
  resetHint,
  onChange,
  className,
  compact = false,
  showLabel = true,
}: StudioSliderFieldProps) {
  const formatted = displayValue ?? formatStudioControlValue(value, digits);
  const [draft, setDraft] = useState(formatted);

  useEffect(() => {
    setDraft(displayValue ?? formatStudioControlValue(value, digits));
  }, [displayValue, value, digits]);

  const commitDraft = () => {
    const parsed = parse === "pan" ? parsePanInput(draft) : parseStudioNumber(draft);
    if (parsed === null) {
      setDraft(displayValue ?? formatStudioControlValue(value, digits));
      return;
    }
    onChange(clampStudioNumber(parsed, min, max));
  };

  const reset = () => onChange(defaultValue);

  return (
    <div className={className}>
      {!compact && showLabel && (
        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
          <span>{label}</span>
          {resetHint ? <span className="sr-only">{resetHint}</span> : null}
        </div>
      )}
      <div className="flex items-center gap-2">
        {compact && showLabel ? (
          <span className="w-8 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        ) : null}
        <Slider
          className="min-w-0 flex-1"
          min={min}
          max={max}
          step={step}
          value={[value]}
          aria-label={ariaLabel ?? label}
          title={resetHint}
          onDoubleClick={reset}
          onValueChange={([next]) => onChange(next ?? defaultValue)}
        />
        <div className="flex shrink-0 items-center gap-1">
          <Input
            dir="ltr"
            inputMode="decimal"
            className={compact ? "h-6 w-14 px-1 py-0 text-[10px]" : "h-7 w-16 px-1.5 py-0 text-xs"}
            value={draft}
            aria-label={ariaLabel ?? label}
            title={resetHint}
            onChange={(event) => setDraft(event.target.value)}
            onDoubleClick={reset}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setDraft(displayValue ?? formatStudioControlValue(value, digits));
                event.currentTarget.blur();
              }
            }}
            onBlur={commitDraft}
          />
          {unit ? (
            <span dir="ltr" className={`text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
              {unit}
            </span>
          ) : null}
        </div>
      </div>
      {compact && resetHint ? <span className="sr-only">{resetHint}</span> : null}
    </div>
  );
}

export function StudioNumberField({
  label,
  value,
  min,
  max,
  step = 1,
  digits,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  digits?: number;
  onCommit: (value: number) => void;
}) {
  const shown = digits === undefined ? String(value) : formatStudioControlValue(value, digits);
  const [draft, setDraft] = useState(shown);
  useEffect(() => setDraft(digits === undefined ? String(value) : formatStudioControlValue(value, digits)), [value, digits]);
  return (
    <label className="block text-sm">
      <span className="mb-1 block">{label}</span>
      <Input
        dir="ltr"
        inputMode="decimal"
        value={draft}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        onBlur={() => {
          const next = parseStudioNumber(draft);
          if (next === null) {
            setDraft(digits === undefined ? String(value) : formatStudioControlValue(value, digits));
            return;
          }
          onCommit(clampStudioNumber(next, min, max));
        }}
        step={step}
      />
    </label>
  );
}

export function StudioFieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="block text-sm">
      <span className="mb-1 block">{label}</span>
      {children}
    </div>
  );
}
