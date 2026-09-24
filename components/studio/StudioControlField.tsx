"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
  unit?: string;
  displayValue?: string;
  parse?: "number" | "pan";
  ariaLabel?: string;
  resetHint?: string;
  onChange: (value: number) => void;
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
};

const DOUBLE_CLICK_MS = 350;

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const defaultRef = useRef(defaultValue);
  onChangeRef.current = onChange;
  defaultRef.current = defaultValue;

  useEffect(() => {
    setDraft(displayValue ?? formatStudioControlValue(value, digits));
  }, [displayValue, value, digits]);

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    let last = 0;
    const onPointerDown = (event: PointerEvent) => {
      const now = performance.now();
      if (now - last <= DOUBLE_CLICK_MS) {
        event.preventDefault();
        event.stopImmediatePropagation();
        last = 0;
        onChangeRef.current(defaultRef.current);
        return;
      }
      last = now;
    };
    node.addEventListener("pointerdown", onPointerDown, true);
    return () => node.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  const commitDraft = () => {
    const parsed = parse === "pan" ? parsePanInput(draft) : parseStudioNumber(draft);
    if (parsed === null) {
      setDraft(displayValue ?? formatStudioControlValue(value, digits));
      return;
    }
    onChange(clampStudioNumber(parsed, min, max));
  };

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
        <div ref={wrapRef} className="min-w-0 flex-1" data-studio-reset-wrap="" title={resetHint}>
          <Slider
            className="w-full"
            min={min}
            max={max}
            step={step}
            value={[value]}
            aria-label={ariaLabel ?? label}
            onValueChange={([next]) => onChange(next ?? defaultValue)}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Input
            dir="ltr"
            inputMode="decimal"
            className={compact ? "h-6 w-14 px-1 py-0 text-[10px]" : "h-7 w-16 px-1.5 py-0 text-xs"}
            value={draft}
            aria-label={`${ariaLabel ?? label} value`}
            title={resetHint}
            onChange={(event) => setDraft(event.target.value)}
            onDoubleClick={(event) => {
              event.preventDefault();
              onChange(defaultValue);
            }}
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
