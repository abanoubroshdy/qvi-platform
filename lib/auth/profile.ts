import { isCountryCode } from "@/lib/geo/countries";

export const MIN_ACCOUNT_AGE = 13;
export const MIN_PASSWORD_LENGTH = 6;

export type ProfileFields = {
  fullName: string;
  country: string;
  ageConfirmed?: boolean;
  privacyConsent?: boolean;
  marketingConsent?: boolean;
};

export type ProfileRecord = {
  id: string;
  full_name: string | null;
  country: string | null;
  /** Legacy column. No longer collected or edited. */
  gender?: string | null;
  /** Legacy column. No longer collected or edited. */
  date_of_birth?: string | null;
  /** Legacy column. No longer collected or edited. */
  phone?: string | null;
  age_confirmed?: boolean | null;
  privacy_consent?: boolean | null;
  marketing_consent?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProfileIssue =
  | "fullName"
  | "country"
  | "ageConfirm"
  | "email"
  | "password"
  | "passwordMismatch"
  | "privacyConsent";

export type AuthMetadata = {
  full_name: string;
  country: string;
  age_confirmed: boolean;
  privacy_consent: boolean;
  marketing_consent: boolean;
};

export type SignUpInput = ProfileFields & {
  email: string;
  password: string;
  confirmPassword: string;
  ageConfirmed: boolean;
  privacyConsent: boolean;
  marketingConsent?: boolean;
};

export type PasswordStrength = "empty" | "weak" | "medium" | "strong";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim().toLowerCase());
}

export function isValidFullName(value: string): boolean {
  const name = value.trim();
  if (name.length < 2 || name.length > 80) return false;
  // Latin, Arabic, and combining marks — avoids \\p{L} so tsc can run without raising the compile target.
  return /[A-Za-z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    name,
  );
}

export function validateProfile(fields: ProfileFields): ProfileIssue | null {
  if (!isValidFullName(fields.fullName)) return "fullName";
  if (!isCountryCode(fields.country)) return "country";
  return null;
}

export function validateSignIn(email: string, password: string): ProfileIssue | null {
  if (!isValidEmail(email)) return "email";
  if (password.length < MIN_PASSWORD_LENGTH) return "password";
  return null;
}

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return "empty";
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

export function validateSignUpInput(input: SignUpInput): ProfileIssue | null {
  const profileIssue = validateProfile({
    fullName: input.fullName,
    country: input.country,
  });
  if (profileIssue) return profileIssue;
  if (!input.ageConfirmed) return "ageConfirm";
  if (!isValidEmail(input.email)) return "email";
  if (input.password.length < MIN_PASSWORD_LENGTH) return "password";
  if (input.password !== input.confirmPassword) return "passwordMismatch";
  if (!input.privacyConsent) return "privacyConsent";
  return null;
}

export function toAuthMetadata(fields: ProfileFields): AuthMetadata {
  return {
    full_name: fields.fullName.trim(),
    country: fields.country,
    age_confirmed: fields.ageConfirmed === true,
    privacy_consent: fields.privacyConsent === true,
    marketing_consent: fields.marketingConsent === true,
  };
}

export function toProfileRow(userId: string, fields: ProfileFields) {
  const meta = toAuthMetadata(fields);
  const row: Record<string, unknown> = {
    id: userId,
    full_name: meta.full_name,
    country: meta.country,
    updated_at: new Date().toISOString(),
  };
  if (fields.ageConfirmed !== undefined) row.age_confirmed = meta.age_confirmed;
  if (fields.privacyConsent !== undefined) row.privacy_consent = meta.privacy_consent;
  if (fields.marketingConsent !== undefined) row.marketing_consent = meta.marketing_consent;
  return row;
}

export function isProfileComplete(fields: Partial<ProfileFields> | null | undefined): boolean {
  if (!fields) return false;
  return (
    validateProfile({
      fullName: fields.fullName ?? "",
      country: fields.country ?? "",
    }) === null
  );
}

export function recordToFields(record: ProfileRecord | null): ProfileFields {
  if (!record) {
    return { fullName: "", country: "" };
  }
  return {
    fullName: record.full_name ?? "",
    country: record.country ?? "",
    ageConfirmed: record.age_confirmed === true,
  };
}
