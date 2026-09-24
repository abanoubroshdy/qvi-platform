const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type WaitlistEmailIssue = "required" | "invalid";

export function normalizeWaitlistEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateWaitlistEmail(value: string): WaitlistEmailIssue | null {
  const email = normalizeWaitlistEmail(value);
  if (!email) return "required";
  if (email.length > 254 || !EMAIL_RE.test(email)) return "invalid";
  return null;
}

/** Success only when a configured backend accepts the row, including an existing signup. */
export function waitlistSubmitResult(options: {
  configured: boolean;
  errorCode?: string | null;
}): "done" | "failed" {
  if (!options.configured) return "failed";
  if (options.errorCode && options.errorCode !== "23505") return "failed";
  return "done";
}
