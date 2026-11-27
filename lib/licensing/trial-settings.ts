import type { ProductCode } from "@/lib/licensing/products";
import { isProductCode } from "@/lib/licensing/products";

export type ProductTrialSettingsRow = {
  product_code: string;
  enabled: boolean;
  duration_days: number;
  max_devices: number;
  updated_at: string;
  updated_by: string | null;
};

export type TrialSettingsPatch = {
  enabled?: boolean;
  duration_days?: number;
  max_devices?: number;
};

export type TrialSettingsValidationResult =
  | { ok: true; patch: Required<TrialSettingsPatch> | TrialSettingsPatch }
  | { ok: false; error: string };

const DURATION_MIN = 1;
const DURATION_MAX = 365;
const DEVICES_MIN = 1;
const DEVICES_MAX = 10;

export function isTrialDurationDaysValid(value: number): boolean {
  return Number.isInteger(value) && value >= DURATION_MIN && value <= DURATION_MAX;
}

export function isTrialMaxDevicesValid(value: number): boolean {
  return Number.isInteger(value) && value >= DEVICES_MIN && value <= DEVICES_MAX;
}

export function validateTrialSettingsPatch(
  input: TrialSettingsPatch,
  current?: Pick<ProductTrialSettingsRow, "enabled" | "duration_days" | "max_devices">,
): TrialSettingsValidationResult {
  const enabled = input.enabled ?? current?.enabled;
  const durationDays = input.duration_days ?? current?.duration_days;
  const maxDevices = input.max_devices ?? current?.max_devices;

  if (enabled === undefined || durationDays === undefined || maxDevices === undefined) {
    return { ok: false, error: "Incomplete trial settings." };
  }
  if (typeof enabled !== "boolean") return { ok: false, error: "enabled must be a boolean." };
  if (!isTrialDurationDaysValid(durationDays)) {
    return { ok: false, error: `duration_days must be between ${DURATION_MIN} and ${DURATION_MAX}.` };
  }
  if (!isTrialMaxDevicesValid(maxDevices)) {
    return { ok: false, error: `max_devices must be between ${DEVICES_MIN} and ${DEVICES_MAX}.` };
  }

  return {
    ok: true,
    patch: {
      enabled,
      duration_days: durationDays,
      max_devices: maxDevices,
    },
  };
}

export function computeTrialExpiresAt(durationDays: number, fromMs = Date.now()): string {
  const ms = fromMs + durationDays * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

export function trialDaysRemaining(expiresAt: string | null, nowMs = Date.now()): number | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - nowMs;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function resolveTrialProductCode(value: string | null | undefined): ProductCode | null {
  const trimmed = value?.trim();
  if (!trimmed || !isProductCode(trimmed)) return null;
  return trimmed;
}

export const PUBLIC_TRIAL_SETTINGS_FIELDS = ["enabled", "duration_days"] as const;