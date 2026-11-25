import { describe, expect, it } from "vitest";
import { ownerRegenerateRateLimited } from "@/lib/licensing/admin-actions";

describe("license owner regenerate rate limit", () => {
  it("allows requests under the hourly cap", () => {
    expect(ownerRegenerateRateLimited(0)).toBe(false);
    expect(ownerRegenerateRateLimited(2)).toBe(false);
  });

  it("blocks at and above the cap", () => {
    expect(ownerRegenerateRateLimited(3)).toBe(true);
    expect(ownerRegenerateRateLimited(5)).toBe(true);
  });
});