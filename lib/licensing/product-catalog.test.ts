import { describe, expect, it, vi } from "vitest";
import { loadLicenseProduct } from "@/lib/licensing/product-catalog";

describe("loadLicenseProduct", () => {
  it("surfaces query errors separately from not found", async () => {
    const error = { message: "permission denied", code: "42501", details: null, hint: null };
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error }),
          }),
        }),
      }),
    };

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await loadLicenseProduct(client as never, "NEYORA_PRO");
    consoleError.mockRestore();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("query_error");
      expect(result.code).toBe("42501");
    }
  });

  it("returns not_found when the row is missing", async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    };
    const result = await loadLicenseProduct(client as never, "MISSING");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});