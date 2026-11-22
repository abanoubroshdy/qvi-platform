export function parseAdminEmails(
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

export function isLicenseAdminEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  if (!email) return false;
  const admins = parseAdminEmails(env);
  if (admins.size === 0) return false;
  return admins.has(email.trim().toLowerCase());
}