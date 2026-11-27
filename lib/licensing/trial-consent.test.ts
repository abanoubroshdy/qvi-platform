import { describe, expect, it } from "vitest";
import {
  isTrialTrainingConsentComplete,
  trialConsentRequiredMessage,
  validateTrialTrainingConsent,
} from "@/lib/licensing/trial-consent";

describe("trial training consent validation", () => {
  it("requires both metadata and audio consent", () => {
    expect(isTrialTrainingConsentComplete(true, true)).toBe(true);
    expect(isTrialTrainingConsentComplete(true, false)).toBe(false);
    expect(isTrialTrainingConsentComplete(false, true)).toBe(false);
    expect(validateTrialTrainingConsent(undefined, undefined).ok).toBe(false);
    expect(validateTrialTrainingConsent(true, true).ok).toBe(true);
    expect(validateTrialTrainingConsent(true, false)).toEqual({ ok: false, code: "consent_required" });
  });

  it("returns localized consent_required messages", () => {
    expect(trialConsentRequiredMessage("en")).toMatch(/performance metadata/i);
    expect(trialConsentRequiredMessage("ar")).toMatch(/التجربة المجانية/);
  });
});