import { describe, expect, it } from "vitest";
import { isCountryCode } from "@/lib/geo/countries";
import {
  MIN_ACCOUNT_AGE,
  isProfileComplete,
  isValidEmail,
  isValidFullName,
  passwordStrength,
  toAuthMetadata,
  toProfileRow,
  validateProfile,
  validateSignIn,
  validateSignUpInput,
} from "@/lib/auth/profile";

const validProfile = {
  fullName: "سارة علي",
  country: "EG",
};

describe("profile validation", () => {
  it("accepts a name and country without gender, date of birth, or phone", () => {
    expect(validateProfile(validProfile)).toBeNull();
    expect(isProfileComplete(validProfile)).toBe(true);
    expect(MIN_ACCOUNT_AGE).toBe(13);
  });

  it("requires a real name with letters", () => {
    expect(isValidFullName("A")).toBe(false);
    expect(isValidFullName("   ")).toBe(false);
    expect(isValidFullName("Jane Doe")).toBe(true);
    expect(validateProfile({ ...validProfile, fullName: "1" })).toBe("fullName");
  });

  it("rejects an unknown country and does not require legacy demographic fields", () => {
    expect(validateProfile({ ...validProfile, country: "Egypt" })).toBe("country");
    expect(isCountryCode("EG")).toBe(true);
    expect(validateProfile(validProfile)).toBeNull();
  });

  it("requires an explicit 13+ confirmation at signup", () => {
    const base = {
      ...validProfile,
      email: "you@studio.com",
      password: "secret1",
      confirmPassword: "secret1",
      privacyConsent: true,
      ageConfirmed: false,
    };
    expect(validateSignUpInput(base)).toBe("ageConfirm");
    expect(validateSignUpInput({ ...base, ageConfirmed: true })).toBeNull();
  });

  it("writes name, country, and age confirmation without demographic columns", () => {
    const row = toProfileRow("user-1", {
      ...validProfile,
      ageConfirmed: true,
      privacyConsent: true,
      marketingConsent: false,
    });
    expect(row).toMatchObject({
      id: "user-1",
      full_name: "سارة علي",
      country: "EG",
      age_confirmed: true,
      privacy_consent: true,
      marketing_consent: false,
    });
    expect(row).not.toHaveProperty("gender");
    expect(row).not.toHaveProperty("date_of_birth");
    expect(row).not.toHaveProperty("phone");
    expect(toAuthMetadata({ ...validProfile, ageConfirmed: true }).age_confirmed).toBe(true);
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
        ageConfirmed: true,
      }),
    ).toBe("email");
    expect(
      validateSignUpInput({
        ...validProfile,
        email: "you@studio.com",
        password: "123",
        confirmPassword: "123",
        privacyConsent: true,
        ageConfirmed: true,
      }),
    ).toBe("password");
    expect(
      validateSignUpInput({
        ...validProfile,
        email: "you@studio.com",
        password: "secret1",
        confirmPassword: "secret2",
        privacyConsent: true,
        ageConfirmed: true,
      }),
    ).toBe("passwordMismatch");
    expect(
      validateSignUpInput({
        ...validProfile,
        email: "you@studio.com",
        password: "secret1",
        confirmPassword: "secret1",
        privacyConsent: false,
        ageConfirmed: true,
      }),
    ).toBe("privacyConsent");
    expect(validateSignIn("you@studio.com", "secret1")).toBeNull();
    expect(validateSignIn("bad", "secret1")).toBe("email");
    expect(validateSignIn("you@studio.com", "12")).toBe("password");
    expect(passwordStrength("")).toBe("empty");
    expect(passwordStrength("abc")).toBe("weak");
    expect(passwordStrength("Abcdef12!")).toBe("strong");
  });
});
