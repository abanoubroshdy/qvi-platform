import { describe, expect, it } from "vitest";
import { callingCodeForCountry, isCountryCode } from "@/lib/geo/countries";
import {
  MIN_ACCOUNT_AGE,
  ageOnDate,
  isProfileComplete,
  isValidE164,
  isValidEmail,
  isValidFullName,
  parseIsoDate,
  passwordStrength,
  toE164,
  validateProfile,
  validateSignIn,
  validateSignUpInput,
} from "@/lib/auth/profile";

function isoYearsAgo(years: number, extraDays = 0): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate() - extraDays));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const validProfile = {
  fullName: "سارة علي",
  gender: "female",
  country: "EG",
  dateOfBirth: isoYearsAgo(25),
  phone: "+201001234567",
};

describe("profile validation", () => {
  it("accepts a complete Arabic name, gender, Egypt phone, and adult DOB", () => {
    expect(validateProfile(validProfile)).toBeNull();
    expect(isProfileComplete(validProfile)).toBe(true);
  });

  it("requires a real name with letters", () => {
    expect(isValidFullName("A")).toBe(false);
    expect(isValidFullName("   ")).toBe(false);
    expect(isValidFullName("Jane Doe")).toBe(true);
    expect(validateProfile({ ...validProfile, fullName: "1" })).toBe("fullName");
  });

  it("rejects unknown gender and country values", () => {
    expect(validateProfile({ ...validProfile, gender: "other" })).toBe("gender");
    expect(validateProfile({ ...validProfile, country: "Egypt" })).toBe("country");
    expect(isCountryCode("EG")).toBe(true);
  });

  it("rejects underage and invalid dates of birth", () => {
    expect(parseIsoDate("2020-13-40")).toBeNull();
    expect(validateProfile({ ...validProfile, dateOfBirth: "not-a-date" })).toBe("dateOfBirth");
    expect(validateProfile({ ...validProfile, dateOfBirth: isoYearsAgo(MIN_ACCOUNT_AGE - 1) })).toBe("tooYoung");
    expect(validateProfile({ ...validProfile, dateOfBirth: isoYearsAgo(130) })).toBe("tooOld");
    expect(ageOnDate(parseIsoDate(isoYearsAgo(20)) as Date)).toBeGreaterThanOrEqual(19);
  });

  it("builds and validates E.164 numbers, stripping a leading trunk zero", () => {
    expect(callingCodeForCountry("EG")).toBe("20");
    expect(toE164("EG", "01001234567")).toBe("+201001234567");
    expect(toE164("US", "4155552671")).toBe("+14155552671");
    expect(isValidE164("+201001234567")).toBe(true);
    expect(isValidE164("01001234567")).toBe(false);
    expect(validateProfile({ ...validProfile, phone: "123" })).toBe("phone");
  });

  it("validates signup credentials together with profile fields", () => {
    expect(isValidEmail("you@studio.com")).toBe(true);
    expect(
      validateSignUpInput({
        ...validProfile,
        email: "bad",
        password: "secret1",
        confirmPassword: "secret1",
        privacyConsent: true,
      }),
    ).toBe("email");
    expect(
      validateSignUpInput({
        ...validProfile,
        email: "you@studio.com",
        password: "123",
        confirmPassword: "123",
        privacyConsent: true,
      }),
    ).toBe("password");
    expect(
      validateSignUpInput({
        ...validProfile,
        email: "you@studio.com",
        password: "secret1",
        confirmPassword: "secret2",
        privacyConsent: true,
      }),
    ).toBe("passwordMismatch");
    expect(
      validateSignUpInput({
        ...validProfile,
        email: "you@studio.com",
        password: "secret1",
        confirmPassword: "secret1",
        privacyConsent: false,
      }),
    ).toBe("privacyConsent");
    expect(
      validateSignUpInput({
        ...validProfile,
        email: "you@studio.com",
        password: "secret1",
        confirmPassword: "secret1",
        privacyConsent: true,
        marketingConsent: false,
      }),
    ).toBeNull();
    expect(validateSignIn("you@studio.com", "secret1")).toBeNull();
    expect(validateSignIn("bad", "secret1")).toBe("email");
    expect(validateSignIn("you@studio.com", "12")).toBe("password");
    expect(passwordStrength("")).toBe("empty");
    expect(passwordStrength("abc")).toBe("weak");
    expect(passwordStrength("Abcdef12!")).toBe("strong");
  });
});
