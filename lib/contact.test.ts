import { describe, expect, it } from "vitest";
import { CONTACT_LIMITS, resolveContactToEmail, validateContactFields, validateContactPayload } from "@/lib/contact";

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
      message: "Hello from the form.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_email");
  });

  it("rejects a message that is too short or too long", () => {
    expect(validateContactFields({ name: "Ada", email: "ada@studio.com", message: "Hi" }).message).toBe("too_short");
    const short = validateContactPayload({
      name: "Ada",
      email: "ada@studio.com",
      message: "Hi",
    });
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.error).toBe("too_short");

    const long = validateContactPayload({
      name: "Ada",
      email: "ada@studio.com",
      message: "x".repeat(CONTACT_LIMITS.message + 1),
    });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.error).toBe("too_long");
  });

  it("reports each invalid field for the form", () => {
    expect(validateContactFields({ name: "", email: "bad", message: "" })).toEqual({
      name: "required",
      email: "invalid_email",
      message: "required",
    });
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
