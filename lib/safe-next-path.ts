/** Only same-site paths. Rejects protocol-relative and off-site return targets. */
export function safeNextPath(value: string | null | undefined, fallback = "/account"): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\") || trimmed.includes("://") || trimmed.includes("\n") || trimmed.includes("\r")) {
    return fallback;
  }
  return trimmed;
}
