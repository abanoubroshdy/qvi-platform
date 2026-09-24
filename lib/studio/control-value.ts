/**
 * Shared parse/clamp helpers for studio slider number fields.
 */

export function parseStudioNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  const next = Number(trimmed);
  return Number.isFinite(next) ? next : null;
}

export function clampStudioNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Accepts -1..1, percent -100..100, or L50 / R25 / C pan labels. */
export function parsePanInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper === "C" || upper === "CENTER") return 0;
  const labeled = /^([LR])\s*(\d{1,3})$/i.exec(trimmed);
  if (labeled) {
    const amount = Number(labeled[2]);
    if (!Number.isFinite(amount)) return null;
    const unit = Math.min(100, Math.max(0, amount)) / 100;
    return labeled[1].toUpperCase() === "L" ? -unit : unit;
  }
  const next = parseStudioNumber(trimmed);
  if (next === null) return null;
  if (Math.abs(next) > 1 && Math.abs(next) <= 100) return next / 100;
  return next;
}

export function formatStudioControlValue(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "0";
  if (digits <= 0) return String(Math.round(value));
  return value.toFixed(digits);
}
