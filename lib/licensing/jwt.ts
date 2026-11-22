import type { LicenseTokenPayload } from "@/lib/licensing/types";

function base64UrlEncode(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeJson(value: unknown): string {
  const json = JSON.stringify(value);
  return base64UrlEncode(new TextEncoder().encode(json));
}

function base64UrlDecodeToString(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }
  return atob(padded);
}

export function decodeLicenseToken(token: string): LicenseTokenPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(base64UrlDecodeToString(parts[1])) as LicenseTokenPayload;
  } catch {
    return null;
  }
}

export type SignLicenseTokenInput = {
  licenseId: string;
  productCode: string;
  entitlements: string[];
  deviceFingerprintHash: string;
  status: string;
  maxDevices: number;
  expiresAt: Date | null;
  /** JWT validity; defaults to license expiry or +30 days. */
  tokenExpiresAt?: Date;
};

function resolveTokenExp(input: SignLicenseTokenInput): number {
  const now = Math.floor(Date.now() / 1000);
  if (input.tokenExpiresAt) {
    return Math.floor(input.tokenExpiresAt.getTime() / 1000);
  }
  if (input.expiresAt) {
    return Math.floor(input.expiresAt.getTime() / 1000);
  }
  return now + 60 * 60 * 24 * 30;
}

export async function signLicenseToken(
  input: SignLicenseTokenInput,
  privateKeyPem: string,
): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    sub: input.licenseId,
    product: input.productCode,
    entitlements: input.entitlements,
    device: input.deviceFingerprintHash,
    status: input.status,
    maxDevices: input.maxDevices,
    exp: resolveTokenExp(input),
  };

  const encodedHeader = base64UrlEncodeJson(header);
  const encodedPayload = base64UrlEncodeJson(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const pem = privateKeyPem.replace(/\\n/g, "\n").trim();
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const encodedSig = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${encodedSig}`;
}

function pemToDer(pem: string): ArrayBuffer {
  const lines = pem
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("-----"));
  const b64 = lines.join("");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  const binary =
    typeof Buffer !== "undefined"
      ? Buffer.from(padded, "base64")
      : Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  const bytes = binary instanceof Uint8Array ? binary : new Uint8Array(binary);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export function licenseSigningKeyFromEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string | null {
  const pem = env.LICENSE_SIGNING_PRIVATE_KEY?.trim();
  return pem || null;
}