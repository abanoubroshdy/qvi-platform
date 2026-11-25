import { describe, expect, it } from "vitest";
import { fieldsFromUserMetadata } from "@/lib/supabase/profile";

describe("fieldsFromUserMetadata", () => {
  it("maps signup auth metadata including consents", () => {
    expect(
      fieldsFromUserMetadata({
        full_name: " Jane Doe ",
        country: "US",
        age_confirmed: true,
        privacy_consent: true,
        marketing_consent: false,
      }),
    ).toEqual({
      fullName: "Jane Doe",
      country: "US",
      ageConfirmed: true,
      privacyConsent: true,
      marketingConsent: false,
    });
  });
});