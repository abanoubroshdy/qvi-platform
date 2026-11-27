import { describe, expect, it } from "vitest";
import { trialErrorMessage } from "@/lib/licensing/trial-eligibility";

describe("trial error messages", () => {
  it("returns localized messages for known codes", () => {
    expect(trialErrorMessage("already_claimed", "en")).toContain("already");
    expect(trialErrorMessage("already_claimed", "ar")).toMatch(/سبقاً|مسبقاً/);
    expect(trialErrorMessage("already_licensed", "en")).toContain("active license");
    expect(trialErrorMessage("trial_disabled", "ar")).toBeTruthy();
  });
});