import { describe, expect, it } from "vitest";
import { assessSignupEmail, isDisposableEmailDomain } from "@/lib/auth/disposable-domains";

describe("disposable email domains", () => {
  it("flags known disposable hosts", () => {
    expect(isDisposableEmailDomain("mailinator.com")).toBe(true);
    expect(assessSignupEmail("bot@yopmail.com")).toEqual({
      ok: false,
      code: "disposable_email",
      domain: "yopmail.com",
    });
  });

  it("suggests fixes for common typos", () => {
    expect(assessSignupEmail("user@gamil.com")).toEqual({
      ok: false,
      code: "email_typo",
      domain: "gamil.com",
      suggestion: "gmail.com",
    });
  });

  it("allows normal provider addresses", () => {
    expect(assessSignupEmail("studio@gmail.com")).toEqual({ ok: true });
  });
});