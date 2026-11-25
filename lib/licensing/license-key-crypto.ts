import { formatLicenseKey, normalizeLicenseKey } from "@/lib/licensing/license-key";

export type LicenseKeyCipherPayload = {
  v: 1;
  ct: string;
  iv: string;
  tag: string;
};

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function resolveLicenseKeyEncryptionKey(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): Uint8Array | null {
  const raw = env.LICENSE_KEY_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  try {
    const bytes = fromBase64(raw);
    if (bytes.length !== 32) return null;
    return bytes;
  } catch {
    return null;
  }
}

export function isLicenseKeyEncryptionConfigured(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  return resolveLicenseKeyEncryptionKey(env) !== null;
}

export async function encryptLicenseKeyPlaintext(
  plaintext: string,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): Promise<string | null> {
  const key = resolveLicenseKeyEncryptionKey(env);
  if (!key) return null;

  const normalized = normalizeLicenseKey(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyBytes = new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const encoded = new TextEncoder().encode(normalized);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource, tagLength: 128 },
    cryptoKey,
    encoded as BufferSource,
  );
  const combined = new Uint8Array(cipherBuffer);
  const tag = combined.slice(combined.length - 16);
  const ct = combined.slice(0, combined.length - 16);

  const payload: LicenseKeyCipherPayload = {
    v: 1,
    ct: toBase64(ct),
    iv: toBase64(iv),
    tag: toBase64(tag),
  };
  return JSON.stringify(payload);
}

export async function decryptLicenseKeyPayload(
  stored: string | null | undefined,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): Promise<string | null> {
  if (!stored?.trim()) return null;
  const key = resolveLicenseKeyEncryptionKey(env);
  if (!key) return null;

  let payload: LicenseKeyCipherPayload;
  try {
    payload = JSON.parse(stored) as LicenseKeyCipherPayload;
    if (payload.v !== 1 || !payload.ct || !payload.iv || !payload.tag) return null;
  } catch {
    return null;
  }

  const iv = fromBase64(payload.iv);
  const ct = fromBase64(payload.ct);
  const tag = fromBase64(payload.tag);
  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct);
  combined.set(tag, ct.length);

  const keyBytes = new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const cipherInput = new Uint8Array(combined);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource, tagLength: 128 },
      cryptoKey,
      cipherInput as BufferSource,
    );
    const raw = new TextDecoder().decode(plain);
    return formatLicenseKey(raw);
  } catch {
    return null;
  }
}

export function isVisibleAccountLicenseStatus(status: string): boolean {
  return status !== "revoked";
}