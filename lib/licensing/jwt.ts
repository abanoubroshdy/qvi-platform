import { createPrivateKey, createPublicKey, createVerify } from "node:crypto";
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

function base64UrlDecodeToBuffer(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function base64UrlDecodeToString(input: string): string {
  return base64UrlDecodeToBuffer(input).toString("utf8");
}

/** Decode payload only — never use for authorization without {@link verifyLicenseToken}. */
export function decodeLicenseToken(token: string): LicenseTokenPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(base64UrlDecodeToString(parts[1])) as LicenseTokenPayload;
  } catch {
    return null;
  }
}

export type VerifyLicenseTokenResult =
  | { ok: true; payload: LicenseTokenPayload }
  | { ok: false; error: string; errorCode: string };

let cachedPublicPem: string | null = null;
let cachedPrivatePemSource: string | null = null;

export function resetLicensePublicKeyCache(): void {
  cachedPublicPem = null;
  cachedPrivatePemSource = null;
}

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, "\n").trim();
}

export function licensePublicKeyPemFromSigningKey(
  privateKeyPem: string,
): string | null {
  const normalized = normalizePem(privateKeyPem);
  if (cachedPublicPem && cachedPrivatePemSource === normalized) {
    return cachedPublicPem;
  }
  try {
    const privateKey = createPrivateKey({ key: normalized, format: "pem" });
    const publicKey = createPublicKey(privateKey);
    const publicPem = publicKey.export({ type: "spki", format: "pem" });
    if (typeof publicPem !== "string") return null;
    cachedPublicPem = publicPem;
    cachedPrivatePemSource = normalized;
    return publicPem;
  } catch {
    return null;
  }
}

export function licenseSigningKeyFromEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string | null {
  const pem = env.LICENSE_SIGNING_PRIVATE_KEY?.trim();
  return pem || null;
}

export function licensePublicKeyPemFromEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string | null {
  const privatePem = licenseSigningKeyFromEnv(env);
  if (!privatePem) return null;
  return licensePublicKeyPemFromSigningKey(privatePem);
}

export function verifyLicenseToken(
  token: string,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): VerifyLicenseTokenResult {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { ok: false, error: "Token format is invalid.", errorCode: "invalid_token" };
  }

  const privatePem = licenseSigningKeyFromEnv(env);
  if (!privatePem) {
    return { ok: false, error: "License signing is not configured.", errorCode: "not_configured" };
  }

  const publicPem = licensePublicKeyPemFromSigningKey(privatePem);
  if (!publicPem) {
    return { ok: false, error: "Could not derive license public key.", errorCode: "not_configured" };
  }

  const signingInput = `${parts[0]}.${parts[1]}`;
  const signature = base64UrlDecodeToBuffer(parts[2]!);
  const verifier = createVerify("RSA-SHA256");
  verifier.update(signingInput);
  verifier.end();
  if (!verifier.verify(publicPem, signature)) {
    return { ok: false, error: "Token signature is invalid.", errorCode: "invalid_token" };
  }

  const payload = decodeLicenseToken(token);
  if (!payload?.sub) {
    return { ok: false, error: "Token payload is invalid.", errorCode: "invalid_token" };
  }

  const exp =
    typeof payload.exp === "number"
      ? payload.exp
      : typeof (payload as { expUnix?: number }).expUnix === "number"
        ? (payload as { expUnix: number }).expUnix
        : null;

  if (exp !== null && exp > 0 && exp * 1000 < Date.now()) {
    return { ok: false, error: "Token expired.", errorCode: "expired" };
  }

  if (!payload.device?.trim()) {
    return { ok: false, error: "Token is not bound to a device.", errorCode: "invalid_token" };
  }

  return { ok: true, payload };
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

  const pem = normalizePem(privateKeyPem);
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
  const bytes = Buffer.from(padded, "base64");
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export function deviceFingerprintsMatch(a: string, b: string): boolean {
  const left = a.trim();
  const right = b.trim();
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}