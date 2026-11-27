import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkProductUpdate,
  defaultUpdateChannel,
  paidUpdateChannelRequiresBearer,
  parseUpdateChannel,
} from "@/lib/licensing/updates";
import { PRODUCT_CODES } from "@/lib/licensing/products";
import { resetLicensePublicKeyCache, signLicenseToken } from "@/lib/licensing/jwt";
import { resolveVerifiedLicenseBearer } from "@/lib/licensing/token-access";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const LICENSE_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

afterEach(() => {
  resetLicensePublicKeyCache();
  vi.restoreAllMocks();
});

function mockReleaseClient(release: Record<string, unknown> | null) {
  return {
    from(table: string) {
      if (table !== "license_releases") {
        return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [] }) }) }) }) }) }) };
      }
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: async () => ({ data: release ? [release] : [] }),
      };
      return chain;
    },
  };
}

describe("update channel helpers", () => {
  it("parses supported channels", () => {
    expect(parseUpdateChannel("beta")).toBe("beta");
    expect(parseUpdateChannel(" stable ")).toBe("stable");
    expect(parseUpdateChannel("nightly")).toBeNull();
  });

  it("defaults product channels", () => {
    expect(defaultUpdateChannel(PRODUCT_CODES.qv1Eval)).toBe("evaluation");
    expect(defaultUpdateChannel(PRODUCT_CODES.neyoraPro)).toBe("stable");
  });

  it("requires bearer for paid channels", () => {
    expect(paidUpdateChannelRequiresBearer(PRODUCT_CODES.qv1Eval, "evaluation")).toBe(false);
    expect(paidUpdateChannelRequiresBearer(PRODUCT_CODES.neyoraPro, "beta")).toBe(true);
    expect(paidUpdateChannelRequiresBearer(PRODUCT_CODES.neyoraPro, "stable")).toBe(true);
  });
});

describe("checkProductUpdate", () => {
  it("allows QV1 evaluation updates without a paid license", async () => {
    const result = await checkProductUpdate(
      mockReleaseClient({
        version: "1.0.1",
        release_notes: "notes",
        sha256: "abc",
        file_size: 100,
        mandatory: false,
        min_os_version: null,
      }) as never,
      {
        productCode: PRODUCT_CODES.qv1Eval,
        currentVersion: "1.0.0",
        channel: "evaluation",
        allowPaidChannel: false,
      },
      "https://example.com",
    );
    expect(result.updateAvailable).toBe(true);
    expect(result.channel).toBe("evaluation");
    expect(result.fileSize).toBe(100);
  });

  it("blocks paid channels without license entitlement", async () => {
    const result = await checkProductUpdate(mockReleaseClient(null) as never, {
      productCode: PRODUCT_CODES.neyoraPro,
      currentVersion: "0.0.1",
      channel: "beta",
      allowPaidChannel: false,
    });
    expect(result.updateAvailable).toBe(false);
    expect(result.error).toMatch(/license state/i);
  });

  it("returns metadata for NEYORA beta when licensed", async () => {
    const result = await checkProductUpdate(
      mockReleaseClient({
        version: "0.2.0-beta.2",
        release_notes: "Beta build",
        sha256: "deadbeef",
        file_size: 1024,
        mandatory: true,
        min_os_version: "10.0.19041",
      }) as never,
      {
        productCode: PRODUCT_CODES.neyoraPro,
        currentVersion: "0.2.0-beta",
        channel: "beta",
        allowPaidChannel: true,
      },
      "https://qvi.example",
    );
    expect(result.updateAvailable).toBe(true);
    expect(result.mandatory).toBe(true);
    expect(result.minOsVersion).toBe("10.0.19041");
    expect(result.downloadUrl).toContain("channel=beta");
  });
});

describe("NEYORA_PRO beta bearer verification", () => {
  it("resolves trial tokens with CloudUpdates for beta checks", async () => {
    const token = await signLicenseToken(
      {
        licenseId: LICENSE_ID,
        productCode: "NEYORA_PRO",
        entitlements: ["CloudUpdates"],
        deviceFingerprintHash: "fp-trial",
        status: "active",
        maxDevices: 2,
        expiresAt: new Date(Date.now() + 86_400_000),
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
                    user_id: "user",
                    product_id: "prod",
                    license_key_hash: "x",
                    license_key_hint: "hint",
                    status: "active",
                    max_devices: 2,
                    starts_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
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
                    maybeSingle: async () => ({ data: { id: "device" } }),
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
      const context = await resolveVerifiedLicenseBearer(client as never, token, "NEYORA_PRO");
      expect(context).not.toBeNull();
      expect(context!.entitlements).toContain("CloudUpdates");

      const update = await checkProductUpdate(
        mockReleaseClient({
          version: "0.3.0-beta",
          sha256: "sha",
          mandatory: false,
          file_size: null,
          min_os_version: null,
        }) as never,
        {
          productCode: PRODUCT_CODES.neyoraPro,
          currentVersion: "0.2.0",
          channel: "beta",
          allowPaidChannel: true,
        },
      );
      expect(update.updateAvailable).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.LICENSE_SIGNING_PRIVATE_KEY;
      else process.env.LICENSE_SIGNING_PRIVATE_KEY = previous;
    }
  });
});