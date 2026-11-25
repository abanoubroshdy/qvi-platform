import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  decryptLicenseKeyPayload,
  encryptLicenseKeyPlaintext,
  isVisibleAccountLicenseStatus,
  resolveLicenseKeyEncryptionKey,
} from "@/lib/licensing/license-key-crypto";

const TEST_KEY_B64 = randomBytes(32).toString("base64");

describe("license key encryption", () => {
  const env = { LICENSE_KEY_ENCRYPTION_KEY: TEST_KEY_B64 };

  afterEach(() => {
    delete process.env.LICENSE_KEY_ENCRYPTION_KEY;
  });

  it("round-trips a formatted license key", async () => {
    process.env.LICENSE_KEY_ENCRYPTION_KEY = TEST_KEY_B64;
    expect(resolveLicenseKeyEncryptionKey(env)?.length).toBe(32);
    const sample = "ABCDE-FGHIJ-KLMNO-PQRST";
    const stored = await encryptLicenseKeyPlaintext(sample, env);
    expect(stored).toBeTruthy();
    const decoded = await decryptLicenseKeyPayload(stored, env);
    expect(decoded).toBe(sample);
  });

  it("returns null when encryption is not configured", async () => {
    const stored = await encryptLicenseKeyPlaintext("TEST-KEY", {});
    expect(stored).toBeNull();
  });

  it("hides revoked licenses on the account page", () => {
    expect(isVisibleAccountLicenseStatus("active")).toBe(true);
    expect(isVisibleAccountLicenseStatus("expired")).toBe(true);
    expect(isVisibleAccountLicenseStatus("revoked")).toBe(false);
  });
});