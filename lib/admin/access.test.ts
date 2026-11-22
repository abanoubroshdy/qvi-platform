import { describe, expect, it } from "vitest";
import {
  isLicenseAdminEmail,
  isProtectedAdminEmail,
  isSiteAdminEmail,
  parseAdminEmails,
  parseLicenseAdminEmails,
  parseProtectedAdminEmails,
} from "@/lib/admin/access";

describe("parseAdminEmails", () => {
  it("prefers ADMIN_EMAILS when set", () => {
    const admins = parseAdminEmails({
      ADMIN_EMAILS: "ops@getqvi.com",
      LICENSE_ADMIN_EMAILS: "license@getqvi.com",
    });
    expect(admins.has("ops@getqvi.com")).toBe(true);
    expect(admins.has("license@getqvi.com")).toBe(false);
  });

  it("falls back to LICENSE_ADMIN_EMAILS", () => {
    const admins = parseAdminEmails({ LICENSE_ADMIN_EMAILS: "license@getqvi.com" });
    expect(admins.has("license@getqvi.com")).toBe(true);
  });
});

describe("isSiteAdminEmail", () => {
  it("matches configured admins case-insensitively", () => {
    expect(
      isSiteAdminEmail("Ops@GetQVI.com", {
        ADMIN_EMAILS: "ops@getqvi.com",
      }),
    ).toBe(true);
    expect(isSiteAdminEmail("other@getqvi.com", { ADMIN_EMAILS: "ops@getqvi.com" })).toBe(false);
  });
});

describe("parseProtectedAdminEmails", () => {
  it("unions ADMIN_EMAILS and LICENSE_ADMIN_EMAILS", () => {
    const set = parseProtectedAdminEmails({
      ADMIN_EMAILS: "ops@getqvi.com",
      LICENSE_ADMIN_EMAILS: "license@getqvi.com",
    });
    expect(set.has("ops@getqvi.com")).toBe(true);
    expect(set.has("license@getqvi.com")).toBe(true);
  });
});

describe("isProtectedAdminEmail", () => {
  it("matches either admin list", () => {
    expect(
      isProtectedAdminEmail("license@getqvi.com", {
        ADMIN_EMAILS: "ops@getqvi.com",
        LICENSE_ADMIN_EMAILS: "license@getqvi.com",
      }),
    ).toBe(true);
  });
});

describe("isLicenseAdminEmail", () => {
  it("uses LICENSE_ADMIN_EMAILS when present", () => {
    const env = { LICENSE_ADMIN_EMAILS: "license@getqvi.com", ADMIN_EMAILS: "ops@getqvi.com" };
    expect(isLicenseAdminEmail("license@getqvi.com", env)).toBe(true);
    expect(isLicenseAdminEmail("ops@getqvi.com", env)).toBe(false);
  });

  it("falls back to site admin list when license list is empty", () => {
    expect(
      isLicenseAdminEmail("ops@getqvi.com", {
        ADMIN_EMAILS: "ops@getqvi.com",
      }),
    ).toBe(true);
  });

  it("parses comma and semicolon separated license admin lists", () => {
    const set = parseLicenseAdminEmails({ LICENSE_ADMIN_EMAILS: "a@x.com;b@x.com, c@x.com" });
    expect(set.size).toBe(3);
  });
});