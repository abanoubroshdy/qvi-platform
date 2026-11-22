import type { Messages } from "@/lib/i18n";

/** Localize known license status codes from the database. */
export function licenseStatusLabel(status: string, copy: Messages): string {
  const labels = copy.adminDashboard.licenseStatus;
  const key = status as keyof typeof labels;
  if (key in labels) return labels[key];
  return status;
}