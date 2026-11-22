import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateLicense } from "@/lib/licensing/service";
import { resetLicensePublicKeyCache, signLicenseToken } from "@/lib/licensing/jwt";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const LICENSE_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const env = { LICENSE_SIGNING_PRIVATE_KEY: privateKey };

afterEach(() => {
  resetLicensePublicKeyCache();
  vi.restoreAllMocks();
});

function mockClient(overrides: {
  license?: Record<string, unknown> | null;
  product?: { code: string } | null;
  device?: Record<string, unknown> | null;
}) {
  const license = overrides.license ?? {
    id: LICENSE_ID,
    user_id: "user-1",
    product_id: "prod-1",
    status: "active",
    max_devices: 2,
    expires_at: null,
  };
  const product = overrides.product ?? { code: "NEYORA_PRO" };

  return {
    from(table: string) {
      const api = {
        insert: async () => ({ data: null, error: null }),
        select: () => api,
        eq: (column: string, value: string) => {
          if (table === "licenses" && column === "id") {
            return { maybeSingle: async () => ({ data: value === LICENSE_ID ? license : null }) };
          }
          if (table === "license_products" && column === "id") {
            return { maybeSingle: async () => ({ data: product }) };
          }
          if (table === "license_devices") {
            return {
              eq: () => ({
                is: () => ({
                  maybeSingle: async () => ({ data: overrides.device ?? null }),
                }),
              }),
            };
          }
          return api;
        },
        is: () => api,
        maybeSingle: async () => ({ data: null as unknown }),
        update: () => ({ eq: async () => ({ data: null }) }),
      };
      return api;
    },
    rpc: vi.fn(),
  };
}

describe("validateLicense security", () => {
  it("rejects forged tokens", async () => {
    const previous = process.env.LICENSE_SIGNING_PRIVATE_KEY;
    process.env.LICENSE_SIGNING_PRIVATE_KEY = privateKey;
    try {
      const forged = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhYWFhIn0.forge";
      const result = await validateLicense(
        mockClient({}) as never,
        { licenseToken: forged, deviceFingerprint: "fp" },
        {},
      );
      expect(result.status).toBe(401);
      expect(result.body.errorCode).toBe("invalid_token");
    } finally {
      if (previous === undefined) delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
      else process.env.LICENSE_SIGNING_PRIVATE_KEY = previous;
    }
  });

  it("does not mark an unknown device as revoked", async () => {
    const token = await signLicenseToken(
      {
        licenseId: LICENSE_ID,
        productCode: "NEYORA_PRO",
        entitlements: ["CloudUpdates"],
        deviceFingerprintHash: "fp-known",
        status: "active",
        maxDevices: 2,
        expiresAt: null,
        tokenExpiresAt: new Date(Date.now() + 60_000),
      },
      privateKey,
    );

    const previous = process.env.LICENSE_SIGNING_PRIVATE_KEY;
    process.env.LICENSE_SIGNING_PRIVATE_KEY = privateKey;
    try {
      const result = await validateLicense(
        mockClient({ device: null }) as never,
        { licenseToken: token, deviceFingerprint: "fp-known" },
        {},
      );
      expect(result.status).toBe(403);
      expect(result.body.errorCode).toBe("device_limit");
      expect(result.body.status).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
      else process.env.LICENSE_SIGNING_PRIVATE_KEY = previous;
    }
  });

  void env;
});