import { callingCodeForCountry, isCountryCode } from "@/lib/geo/countries";

export const GENDERS = ["male", "female", "prefer_not_to_say"] as const;
export type Gender = (typeof GENDERS)[number];

export const MIN_ACCOUNT_AGE = 13;
export const MAX_ACCOUNT_AGE = 120;
export const MIN_PASSWORD_LENGTH = 6;

export type ProfileFields = {
  fullName: string;
  gender: string;
  country: string;
  dateOfBirth: string;
  phone: string;
  privacyConsent?: boolean;
  marketingConsent?: boolean;
};

export type ProfileRecord = {
  id: string;
  full_name: string | null;
  gender: string | null;
  country: string | null;
  date_of_birth: string | null;
  phone: string | null;
  privacy_consent?: boolean | null;
  marketing_consent?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProfileIssue =
  | "fullName"
  | "gender"
  | "country"
  | "dateOfBirth"
  | "tooYoung"
  | "tooOld"
  | "phone"
  | "email"
  | "password"
  | "passwordMismatch"
  | "privacyConsent";

export type AuthMetadata = {
  full_name: string;
  gender: Gender;
  country: string;
  date_of_birth: string;
  phone: string;
  privacy_consent: boolean;
  marketing_consent: boolean;
};

export type SignUpInput = ProfileFields & {
  email: string;
  password: string;
  confirmPassword: string;
  privacyConsent: boolean;
  marketingConsent?: boolean;
};

export type PasswordStrength = "empty" | "weak" | "medium" | "strong";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+[1-9]\d{7,14}$/;

export function isGender(value: string): value is Gender {
  return (GENDERS as readonly string[]).includes(value);
}

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

function toIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dobInputBounds(today = new Date()): { min: string; max: string } {
  const max = new Date(
    Date.UTC(today.getUTCFullYear() - MIN_ACCOUNT_AGE, today.getUTCMonth(), today.getUTCDate()),
  );
  const min = new Date(
    Date.UTC(today.getUTCFullYear() - MAX_ACCOUNT_AGE, today.getUTCMonth(), today.getUTCDate()),
  );
  return { min: toIsoDate(min), max: toIsoDate(max) };
}

export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function ageOnDate(dob: Date, today = new Date()): number {
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function nationalDigits(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+/, "");
}

export function toE164(country: string, national: string): string {
  const code = callingCodeForCountry(country);
  const digits = nationalDigits(national);
  if (!code || !digits) return "";
  const stripped = digits.startsWith(code) && digits.length > code.length + 4 ? digits.slice(code.length) : digits;
  return `+${code}${stripped}`;
}

export function splitE164(phone: string, country: string): { callingCode: string; national: string } {
  const callingCode = callingCodeForCountry(country);
  const digits = phone.replace(/\D/g, "");
  if (callingCode && digits.startsWith(callingCode)) {
    return { callingCode, national: digits.slice(callingCode.length) };
  }
  return { callingCode, national: digits };
}

export function isValidE164(phone: string): boolean {
  return E164_RE.test(phone);
}

export function validateProfile(fields: ProfileFields): ProfileIssue | null {
  if (!isValidFullName(fields.fullName)) return "fullName";
  if (!isGender(fields.gender)) return "gender";
  if (!isCountryCode(fields.country)) return "country";

  const dob = parseIsoDate(fields.dateOfBirth);
  if (!dob) return "dateOfBirth";
  const age = ageOnDate(dob);
  if (age < MIN_ACCOUNT_AGE) return "tooYoung";
  if (age > MAX_ACCOUNT_AGE) return "tooOld";

  if (!isValidE164(fields.phone)) return "phone";
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
    gender: input.gender,
    country: input.country,
    dateOfBirth: input.dateOfBirth,
    phone: input.phone,
  });
  if (profileIssue) return profileIssue;
  if (!isValidEmail(input.email)) return "email";
  if (input.password.length < MIN_PASSWORD_LENGTH) return "password";
  if (input.password !== input.confirmPassword) return "passwordMismatch";
  if (!input.privacyConsent) return "privacyConsent";
  return null;
}

export function toAuthMetadata(fields: ProfileFields): AuthMetadata {
  return {
    full_name: fields.fullName.trim(),
    gender: fields.gender as Gender,
    country: fields.country,
    date_of_birth: fields.dateOfBirth,
    phone: fields.phone,
    privacy_consent: fields.privacyConsent === true,
    marketing_consent: fields.marketingConsent === true,
  };
}

export function toProfileRow(userId: string, fields: ProfileFields) {
  const meta = toAuthMetadata(fields);
  const row: Record<string, unknown> = {
    id: userId,
    full_name: meta.full_name,
    gender: meta.gender,
    country: meta.country,
    date_of_birth: meta.date_of_birth,
    phone: meta.phone,
    updated_at: new Date().toISOString(),
  };
  if (fields.privacyConsent !== undefined) row.privacy_consent = meta.privacy_consent;
  if (fields.marketingConsent !== undefined) row.marketing_consent = meta.marketing_consent;
  return row;
}

export function profileFromUnknown(data: Record<string, unknown> | null | undefined): ProfileFields {
  return {
    fullName: typeof data?.full_name === "string" ? data.full_name : "",
    gender: typeof data?.gender === "string" ? data.gender : "",
    country: typeof data?.country === "string" ? data.country : "",
    dateOfBirth: typeof data?.date_of_birth === "string" ? data.date_of_birth.slice(0, 10) : "",
    phone: typeof data?.phone === "string" ? data.phone : "",
  };
}

export function isProfileComplete(fields: Partial<ProfileFields> | null | undefined): boolean {
  if (!fields) return false;
  return validateProfile({
    fullName: fields.fullName ?? "",
    gender: fields.gender ?? "",
    country: fields.country ?? "",
    dateOfBirth: fields.dateOfBirth ?? "",
    phone: fields.phone ?? "",
  }) === null;
}

export function recordToFields(record: ProfileRecord | null): ProfileFields {
  if (!record) {
    return { fullName: "", gender: "", country: "", dateOfBirth: "", phone: "" };
  }
  return {
    fullName: record.full_name ?? "",
    gender: record.gender ?? "",
    country: record.country ?? "",
    dateOfBirth: record.date_of_birth ? record.date_of_birth.slice(0, 10) : "",
    phone: record.phone ?? "",
  };
}
