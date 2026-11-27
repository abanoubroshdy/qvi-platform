import { describe, expect, it } from "vitest";
import { isVisibleAccountLicenseStatus } from "@/lib/licensing/license-key-crypto";
import { hasRetrievableKeyFromRow } from "@/lib/supabase/licensing";

describe("account license list filter", () => {
  it("excludes revoked licenses from account visibility", () => {
    expect(isVisibleAccountLicenseStatus("active")).toBe(true);
    expect(isVisibleAccountLicenseStatus("expired")).toBe(true);
    expect(isVisibleAccountLicenseStatus("revoked")).toBe(false);
  });
});

describe("hasRetrievableKeyFromRow", () => {
  it("is true when ciphertext is present", () => {
    expect(hasRetrievableKeyFromRow({ license_key_encrypted: '{"v":1}' })).toBe(true);
  });

  it("is false when ciphertext is null or empty", () => {
    expect(hasRetrievableKeyFromRow({ license_key_encrypted: null })).toBe(false);
    expect(hasRetrievableKeyFromRow({ license_key_encrypted: "" })).toBe(false);
    expect(hasRetrievableKeyFromRow({})).toBe(false);
  });
});