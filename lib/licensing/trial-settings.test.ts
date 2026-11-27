import { describe, expect, it } from "vitest";
import {
  computeTrialExpiresAt,
  isTrialDurationDaysValid,
  isTrialMaxDevicesValid,
  trialDaysRemaining,
  validateTrialSettingsPatch,
} from "@/lib/licensing/trial-settings";

describe("trial settings validation", () => {
  it("accepts valid patches", () => {
    const result = validateTrialSettingsPatch(
      { enabled: true, duration_days: 30, max_devices: 2 },
      { enabled: false, duration_days: 14, max_devices: 1 },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch).toEqual({ enabled: true, duration_days: 30, max_devices: 2 });
    }
  });

  it("rejects duration out of range", () => {
    expect(validateTrialSettingsPatch({ duration_days: 0 }, { enabled: true, duration_days: 14, max_devices: 1 }).ok).toBe(
      false,
    );
    expect(validateTrialSettingsPatch({ duration_days: 400 }, { enabled: true, duration_days: 14, max_devices: 1 }).ok).toBe(
      false,
    );
  });

  it("rejects max_devices out of range", () => {
    expect(validateTrialSettingsPatch({ max_devices: 0 }, { enabled: true, duration_days: 14, max_devices: 1 }).ok).toBe(
      false,
    );
    expect(validateTrialSettingsPatch({ max_devices: 11 }, { enabled: true, duration_days: 14, max_devices: 1 }).ok).toBe(
      false,
    );
  });

  it("validates helper bounds", () => {
    expect(isTrialDurationDaysValid(1)).toBe(true);
    expect(isTrialDurationDaysValid(365)).toBe(true);
    expect(isTrialDurationDaysValid(366)).toBe(false);
    expect(isTrialMaxDevicesValid(10)).toBe(true);
    expect(isTrialMaxDevicesValid(11)).toBe(false);
  });
});

describe("trial expiry helpers", () => {
  it("computes expiry from duration days", () => {
    const from = Date.UTC(2026, 10, 27, 12, 0, 0);
    const expires = computeTrialExpiresAt(14, from);
    expect(new Date(expires).getTime()).toBe(from + 14 * 86_400_000);
  });

  it("returns remaining whole days", () => {
    const now = Date.UTC(2026, 10, 27, 12, 0, 0);
    const inThreeDays = new Date(now + 2.2 * 86_400_000).toISOString();
    expect(trialDaysRemaining(inThreeDays, now)).toBe(3);
    expect(trialDaysRemaining(new Date(now - 1000).toISOString(), now)).toBe(0);
  });
});