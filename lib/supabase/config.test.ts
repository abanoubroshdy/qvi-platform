import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_URL,
  DEFAULT_SUPABASE_URL,
  isLikelyServiceRoleKey,
  isSupabaseHost,
  resolvePublicSupabaseConfig,
  resolveSiteUrl,
} from "@/lib/supabase/config";

function jwtWithRole(role: string) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role })).toString("base64url");
  return `${header}.${payload}.sig`;
}

describe("supabase public config", () => {
  it("treats supabase project hosts as backend URLs, not the public site", () => {
    expect(isSupabaseHost("https://eiwvlsmgrhzzriuaftfx.supabase.co")).toBe(true);
    expect(isSupabaseHost("https://qvi-platform.vercel.app")).toBe(false);
    expect(isSupabaseHost("https://getqvi.com")).toBe(false);
  });

  it("reads anon keys from unprefixed Vercel names and recovers a misplaced site URL", () => {
    const config = resolvePublicSupabaseConfig({
      NEXT_PUBLIC_SITE_URL: "https://eiwvlsmgrhzzriuaftfx.supabase.co",
      SUPABASE_ANON_KEY: jwtWithRole("anon"),
    });
    expect(config).toEqual({
      url: "https://eiwvlsmgrhzzriuaftfx.supabase.co",
      anonKey: jwtWithRole("anon"),
    });
  });

  it("falls back to the known project URL when only the anon key is set", () => {
    const config = resolvePublicSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: jwtWithRole("anon"),
    });
    expect(config?.url).toBe(DEFAULT_SUPABASE_URL);
  });

  it("does not expose a service-role key to the browser", () => {
    expect(
      resolvePublicSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: DEFAULT_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: jwtWithRole("service_role"),
      }),
    ).toBeNull();
    expect(isLikelyServiceRoleKey(jwtWithRole("service_role"))).toBe(true);
  });

  it("returns null when no anon key exists", () => {
    expect(resolvePublicSupabaseConfig({})).toBeNull();
  });

  it("does not use a supabase host as the public site URL", () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://eiwvlsmgrhzzriuaftfx.supabase.co",
        VERCEL_URL: "qvi-platform.vercel.app",
      }),
    ).toBe("https://qvi-platform.vercel.app");
    expect(resolveSiteUrl({})).toBe(DEFAULT_SITE_URL);
  });
});
