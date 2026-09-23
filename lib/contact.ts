const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

export type ContactPayloadInput = ContactPayload & {
  /** Honeypot — must stay empty for legitimate submissions. */
  website?: string;
};

export const CONTACT_LIMITS = {
  name: 200,
  email: 254,
  messageMin: 10,
  message: 5000,
} as const;

export type ContactField = "name" | "email" | "message";
export type ContactFieldIssue = "required" | "invalid_email" | "too_short" | "too_long";

export function validateContactFields(input: {
  name: string;
  email: string;
  message: string;
}): Partial<Record<ContactField, ContactFieldIssue>> {
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();
  const errors: Partial<Record<ContactField, ContactFieldIssue>> = {};

  if (!name) errors.name = "required";
  else if (name.length > CONTACT_LIMITS.name) errors.name = "too_long";

  if (!email) errors.email = "required";
  else if (email.length > CONTACT_LIMITS.email || !EMAIL_PATTERN.test(email)) errors.email = "invalid_email";

  if (!message) errors.message = "required";
  else if (message.length < CONTACT_LIMITS.messageMin) errors.message = "too_short";
  else if (message.length > CONTACT_LIMITS.message) errors.message = "too_long";

  return errors;
}

export function validateContactPayload(
  body: unknown,
): { ok: true; data: ContactPayload; honeypot: boolean } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "invalid_body" };
  }

  const record = body as Record<string, unknown>;
  const website = typeof record.website === "string" ? record.website.trim() : "";
  if (website.length > 0) {
    return { ok: true, data: { name: "", email: "", message: "" }, honeypot: true };
  }

  const name = typeof record.name === "string" ? record.name.trim() : "";
  const email = typeof record.email === "string" ? record.email.trim() : "";
  const message = typeof record.message === "string" ? record.message.trim() : "";

  const fields = validateContactFields({ name, email, message });
  if (fields.name === "required" || fields.email === "required" || fields.message === "required") {
    return { ok: false, error: "missing_fields" };
  }
  if (fields.email === "invalid_email") {
    return { ok: false, error: "invalid_email" };
  }
  if (fields.message === "too_short") {
    return { ok: false, error: "too_short" };
  }
  if (fields.name === "too_long" || fields.message === "too_long") {
    return { ok: false, error: "too_long" };
  }

  return { ok: true, data: { name, email, message }, honeypot: false };
}

export function resolveContactToEmail(): string {
  return process.env.CONTACT_TO_EMAIL?.trim() || "support@getqvi.com";
}

export function resolveContactFromEmail(): string | null {
  const from = process.env.CONTACT_FROM_EMAIL?.trim();
  return from || null;
}

export async function sendContactEmail(payload: ContactPayload): Promise<
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "provider_error";
    }
> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveContactFromEmail();
  if (!apiKey || !from) {
    return { ok: false, reason: "not_configured" };
  }

  const to = resolveContactToEmail();
  const subject = `QVI contact — ${payload.name}`;
  const text = [`Name: ${payload.name}`, `Email: ${payload.email}`, "", payload.message].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: payload.email,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    return { ok: false, reason: "provider_error" };
  }

  return { ok: true };
}
