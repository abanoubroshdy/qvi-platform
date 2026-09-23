import { describe, expect, it } from "vitest";
import { resolveContactToEmail, validateContactPayload } from "@/lib/contact";

describe("validateContactPayload", () => {
  it("accepts a valid payload", () => {
    const result = validateContactPayload({
      name: "Ada",
      email: "ada@studio.com",
      message: "Hello from the form.",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.honeypot).toBe(false);
      expect(result.data.email).toBe("ada@studio.com");
    }
  });

  it("rejects missing fields", () => {
    expect(validateContactPayload({ name: "Ada", email: "" }).ok).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = validateContactPayload({
      name: "Ada",
      email: "not-an-email",
      message: "Hi",
    });
    expect(result.ok).toBe(false);
  });

  it("treats honeypot submissions as success without data", () => {
    const result = validateContactPayload({
      name: "Bot",
      email: "bot@evil.com",
      message: "spam",
      website: "https://spam.test",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.honeypot).toBe(true);
    }
  });
});

describe("resolveContactToEmail", () => {
  it("defaults to support@getqvi.com", () => {
    const previous = process.env.CONTACT_TO_EMAIL;
    delete process.env.CONTACT_TO_EMAIL;
    expect(resolveContactToEmail()).toBe("support@getqvi.com");
    if (previous === undefined) {
      delete process.env.CONTACT_TO_EMAIL;
    } else {
      process.env.CONTACT_TO_EMAIL = previous;
    }
  });
});
