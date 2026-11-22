import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  resetLicensePublicKeyCache,
  signLicenseToken,
  verifyLicenseToken,
  decodeLicenseToken,
} from "@/lib/licensing/jwt";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const env = { LICENSE_SIGNING_PRIVATE_KEY: privateKey };

afterEach(() => {
  resetLicensePublicKeyCache();
});

describe("verifyLicenseToken", () => {
  it("accepts a token signed with the configured private key", async () => {
    const token = await signLicenseToken(
      {
        licenseId: "11111111-1111-1111-1111-111111111111",
        productCode: "NEYORA_PRO",
        entitlements: ["CloudUpdates"],
        deviceFingerprintHash: "device-abc",
        status: "active",
        maxDevices: 2,
        expiresAt: null,
        tokenExpiresAt: new Date(Date.now() + 60_000),
      },
      privateKey,
    );

    const verified = verifyLicenseToken(token, env);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.payload.sub).toBe("11111111-1111-1111-1111-111111111111");
      expect(verified.payload.device).toBe("device-abc");
    }
  });

  it("rejects a tampered payload", async () => {
    const token = await signLicenseToken(
      {
        licenseId: "11111111-1111-1111-1111-111111111111",
        productCode: "NEYORA_PRO",
        entitlements: [],
        deviceFingerprintHash: "device-abc",
        status: "active",
        maxDevices: 2,
        expiresAt: null,
        tokenExpiresAt: new Date(Date.now() + 60_000),
      },
      privateKey,
    );

    const parts = token.split(".");
    const payload = decodeLicenseToken(token);
    expect(payload).not.toBeNull();
    const tampered = `${parts[0]}.${parts[1]!.slice(0, -1)}X.${parts[2]}`;
    const verified = verifyLicenseToken(tampered, env);
    expect(verified.ok).toBe(false);
  });

  it("rejects tokens signed with a different key", async () => {
    const other = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    const token = await signLicenseToken(
      {
        licenseId: "22222222-2222-2222-2222-222222222222",
        productCode: "NEYORA_PRO",
        entitlements: [],
        deviceFingerprintHash: "device-abc",
        status: "active",
        maxDevices: 2,
        expiresAt: null,
        tokenExpiresAt: new Date(Date.now() + 60_000),
      },
      other.privateKey,
    );

    const verified = verifyLicenseToken(token, env);
    expect(verified.ok).toBe(false);
  });

  it("rejects expired tokens", async () => {
    const token = await signLicenseToken(
      {
        licenseId: "33333333-3333-3333-3333-333333333333",
        productCode: "NEYORA_PRO",
        entitlements: [],
        deviceFingerprintHash: "device-abc",
        status: "active",
        maxDevices: 2,
        expiresAt: null,
        tokenExpiresAt: new Date(Date.now() - 60_000),
      },
      privateKey,
    );

    const verified = verifyLicenseToken(token, env);
    expect(verified.ok).toBe(false);
    if (!verified.ok) expect(verified.errorCode).toBe("expired");
  });

  it("rejects tokens without a device claim", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(
      JSON.stringify({
        sub: "44444444-4444-4444-4444-444444444444",
        product: "NEYORA_PRO",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
    const data = `${header}.${body}`;
    const { createSign } = await import("node:crypto");
    const signer = createSign("RSA-SHA256");
    signer.update(data);
    const sig = signer.sign(privateKey).toString("base64url");
    const verified = verifyLicenseToken(`${data}.${sig}`, env);
    expect(verified.ok).toBe(false);
  });

  void publicKey;
});