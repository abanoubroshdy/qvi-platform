const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeLicenseKey(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function formatLicenseKey(raw: string): string {
  const normalized = normalizeLicenseKey(raw);
  const groups: string[] = [];
  for (let i = 0; i < normalized.length; i += 5) {
    groups.push(normalized.slice(i, i + 5));
  }
  return groups.join("-");
}

export function licenseKeyHint(formattedKey: string): string {
  const normalized = normalizeLicenseKey(formattedKey);
  if (normalized.length <= 8) return "****";
  return `${normalized.slice(0, 4)}…${normalized.slice(-4)}`;
}

export async function hashLicenseKey(input: string): Promise<string> {
  const normalized = normalizeLicenseKey(input);
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

export function generateLicenseKey(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let raw = "";
  for (let i = 0; i < bytes.length; i += 1) {
    raw += KEY_ALPHABET[bytes[i]! % KEY_ALPHABET.length];
  }
  return formatLicenseKey(raw);
}