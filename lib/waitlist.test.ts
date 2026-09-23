import { describe, expect, it } from "vitest";
import { normalizeWaitlistEmail, validateWaitlistEmail, waitlistSubmitResult } from "@/lib/waitlist";

describe("validateWaitlistEmail", () => {
  it("accepts a normal address", () => {
    expect(validateWaitlistEmail("  You@Studio.com ")).toBeNull();
    expect(normalizeWaitlistEmail("  You@Studio.com ")).toBe("you@studio.com");
  });

  it("requires an address", () => {
    expect(validateWaitlistEmail("   ")).toBe("required");
  });

  it("rejects a malformed address", () => {
    expect(validateWaitlistEmail("not-an-email")).toBe("invalid");
    expect(validateWaitlistEmail("a@b")).toBe("invalid");
  });
});

describe("waitlistSubmitResult", () => {
  it("treats a missing backend or a failed insert as failure", () => {
    expect(waitlistSubmitResult({ configured: false })).toBe("failed");
    expect(waitlistSubmitResult({ configured: true, errorCode: "42501" })).toBe("failed");
  });

  it("treats a clean insert or an existing signup as success", () => {
    expect(waitlistSubmitResult({ configured: true, errorCode: null })).toBe("done");
    expect(waitlistSubmitResult({ configured: true, errorCode: "23505" })).toBe("done");
  });
});
