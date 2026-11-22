export function parseLicenseAdminEmails(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): Set<string> {
  const raw = env.LICENSE_ADMIN_EMAILS?.trim() || "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;]/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function parseAdminEmails(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): Set<string> {
  const primary = env.ADMIN_EMAILS?.trim();
  const raw = primary || env.LICENSE_ADMIN_EMAILS?.trim() || "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;]/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isSiteAdminEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  if (!email) return false;
  const admins = parseAdminEmails(env);
  if (admins.size === 0) return false;
  return admins.has(email.trim().toLowerCase());
}

/** Union of ADMIN_EMAILS and LICENSE_ADMIN_EMAILS — accounts that must not be hard-deleted. */
export function parseProtectedAdminEmails(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): Set<string> {
  const merged = new Set<string>();
  parseAdminEmails(env).forEach((email) => merged.add(email));
  parseLicenseAdminEmails(env).forEach((email) => merged.add(email));
  return merged;
}

export function isProtectedAdminEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  if (!email) return false;
  const protectedEmails = parseProtectedAdminEmails(env);
  if (protectedEmails.size === 0) return false;
  return protectedEmails.has(email.trim().toLowerCase());
}

export function isLicenseAdminEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  if (!email) return false;
  const admins = parseLicenseAdminEmails(env);
  if (admins.size === 0) {
    return isSiteAdminEmail(email, env);
  }
  return admins.has(email.trim().toLowerCase());
}