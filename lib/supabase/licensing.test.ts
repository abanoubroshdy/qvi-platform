import { describe, expect, it } from "vitest";
import { isVisibleAccountLicenseStatus } from "@/lib/licensing/license-key-crypto";

describe("account license list filter", () => {
  it("excludes revoked licenses from account visibility", () => {
    expect(isVisibleAccountLicenseStatus("active")).toBe(true);
    expect(isVisibleAccountLicenseStatus("expired")).toBe(true);
    expect(isVisibleAccountLicenseStatus("revoked")).toBe(false);
  });
});