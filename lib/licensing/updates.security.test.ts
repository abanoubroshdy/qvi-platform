import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveVerifiedLicenseBearer } from "@/lib/licensing/token-access";
import { resetLicensePublicKeyCache, signLicenseToken } from "@/lib/licensing/jwt";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const LICENSE_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

afterEach(() => {
  resetLicensePublicKeyCache();
  vi.restoreAllMocks();
});

describe("resolveVerifiedLicenseBearer", () => {
  it("returns null when bearer product does not match requested product", async () => {
    const token = await signLicenseToken(
      {
        licenseId: LICENSE_ID,
        productCode: "NEYORA_PRO",
        entitlements: ["CloudUpdates"],
        deviceFingerprintHash: "fp-1",
        status: "active",
        maxDevices: 2,
        expiresAt: null,
        tokenExpiresAt: new Date(Date.now() + 60_000),
      },
      privateKey,
    );

    const previous = process.env.LICENSE_SIGNING_PRIVATE_KEY;
    process.env.LICENSE_SIGNING_PRIVATE_KEY = privateKey;

    const client = {
      from: (table: string) => {
        const chain = {
          select: () => chain,
          eq: (column: string, value: string) => {
            if (table === "licenses" && column === "id" && value === LICENSE_ID) {
              return {
                maybeSingle: async () => ({
                  data: {
                    id: LICENSE_ID,
                    user_id: "u",
                    product_id: "p",
                    status: "active",
                    max_devices: 2,
                    expires_at: null,
                  },
                }),
              };
            }
            if (table === "license_products") {
              return { maybeSingle: async () => ({ data: { code: "NEYORA_PRO" } }) };
            }
            if (table === "license_devices") {
              return {
                eq: () => ({
                  is: () => ({
                    maybeSingle: async () => ({ data: { id: "dev" } }),
                  }),
                }),
              };
            }
            return { maybeSingle: async () => ({ data: null }) };
          },
          is: () => chain,
        };
        return chain;
      },
    };

    try {
      const neyora = await resolveVerifiedLicenseBearer(client as never, token, "NEYORA_PRO");
      expect(neyora).not.toBeNull();

      const qv1 = await resolveVerifiedLicenseBearer(client as never, token, "QV1_PRO");
      expect(qv1).toBeNull();
    } finally {
      if (previous === undefined) delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
      else process.env.LICENSE_SIGNING_PRIVATE_KEY = previous;
    }
  });
});