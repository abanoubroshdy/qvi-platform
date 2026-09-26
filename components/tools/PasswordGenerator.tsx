"use client";

import { useMemo, useState } from "react";
import { Stat } from "@/components/Stat";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";

function randomFrom(source: string) {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return source[bytes[0] % source.length] ?? source[0];
}

function shuffle(chars: string[]) {
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    const swap = bytes[0] % (index + 1);
    const current = chars[index];
    chars[index] = chars[swap] ?? current;
    chars[swap] = current;
  }
  return chars.join("");
}

export function PasswordGenerator() {
  const { copy } = useI18n();
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pool = useMemo(() => {
    return [
      lowercase ? LOWER : "",
      uppercase ? UPPER : "",
      numbers ? NUMBERS : "",
      symbols ? SYMBOLS : "",
    ].join("");
  }, [lowercase, numbers, symbols, uppercase]);

  const sets = [lowercase, uppercase, numbers, symbols].filter(Boolean).length;

  const strength = useMemo(() => {
    if (!password) return null;
    if (length < 10 || sets < 2) return "weak";
    if (length >= 12 && sets >= 3) return "strong";
    return "medium";
  }, [length, password, sets]);

  function generate() {
    if (!pool) {
      setError(copy.password.charsetError);
      setPassword("");
      return;
    }
    setError(null);
    const required: string[] = [];
    if (lowercase) required.push(randomFrom(LOWER));
    if (uppercase) required.push(randomFrom(UPPER));
    if (numbers) required.push(randomFrom(NUMBERS));
    if (symbols) required.push(randomFrom(SYMBOLS));
    const rest = Array.from({ length: Math.max(0, length - required.length) }, () => randomFrom(pool));
    setPassword(shuffle([...required, ...rest]).slice(0, length));
  }

  const strengthLabel =
    strength === "strong" ? copy.password.strong : strength === "medium" ? copy.password.medium : copy.password.weak;

  return (
    <ToolLayout
      hideDropzone
      emptyPreviewText={copy.password.empty}
      actionLabel={copy.password.action}
      onAction={generate}
      downloadLabel={copy.password.download}
      onDownload={() => password && void copyText(password)}
      downloadDisabled={!password}
      error={error}
      settings={
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <Label htmlFor="password-length">{copy.password.length}</Label>
              <span className="text-sm font-semibold tabular-nums text-primary">{length}</span>
            </div>
            <div dir="ltr">
              <Slider
                id="password-length"
                min={6}
                max={32}
                step={1}
                value={[length]}
                onValueChange={(value) => setLength(value[0] ?? 16)}
                aria-label={copy.password.length}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { id: "uppercase", checked: uppercase, onChange: setUppercase, label: copy.password.uppercase },
              { id: "lowercase", checked: lowercase, onChange: setLowercase, label: copy.password.lowercase },
              { id: "numbers", checked: numbers, onChange: setNumbers, label: copy.password.numbers },
              { id: "symbols", checked: symbols, onChange: setSymbols, label: copy.password.symbols },
            ].map((option) => (
              <label key={option.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  id={option.id}
                  type="checkbox"
                  checked={option.checked}
                  onChange={(event) => option.onChange(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      }
      extra={
        strength ? (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm font-semibold",
              strength === "strong" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              strength === "medium" && "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
              strength === "weak" && "border-destructive/40 bg-destructive/10 text-destructive",
            )}
          >
            {copy.password.strength}: {strengthLabel}
          </div>
        ) : null
      }
      preview={
        password ? (
          <div className="space-y-3">
            <p className="break-all rounded-lg bg-muted/60 px-3 py-4 text-center font-mono text-lg font-semibold" dir="ltr">
              {password}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Stat label={copy.password.length} value={`${password.length}`} />
              <Stat label={copy.password.strength} value={strengthLabel} />
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
