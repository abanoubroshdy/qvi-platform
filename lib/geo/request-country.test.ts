import { describe, expect, it } from "vitest";
import { requestCfCountry, resolveGeoCountry } from "@/lib/geo/request-country";

function headers(values: Record<string, string>): { get(name: string): string | null } {
  const lower = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return { get: (name) => lower.get(name.toLowerCase()) ?? null };
}

describe("resolveGeoCountry", () => {
  it("prefers Cloudflare request.cf.country over the Vercel header", () => {
    expect(
      resolveGeoCountry({
        requestCfCountry: "eg",
        headers: headers({ "x-vercel-ip-country": "US" }),
      }),
    ).toBe("EG");
  });

  it("uses the OpenNext copy of request.cf when the Request wrapper dropped it", () => {
    expect(
      resolveGeoCountry({
        contextCfCountry: "de",
        headers: headers({ "cf-ipcountry": "FR" }),
      }),
    ).toBe("DE");
  });

  it("keeps the Vercel header when Cloudflare has no country", () => {
    expect(
      resolveGeoCountry({
        headers: headers({ "x-vercel-ip-country": "us" }),
      }),
    ).toBe("US");
  });

  it("falls through empty Cloudflare values to cf-ipcountry and x-country-code", () => {
    expect(
      resolveGeoCountry({
        requestCfCountry: "",
        headers: headers({ "cf-ipcountry": "jp" }),
      }),
    ).toBe("JP");
    expect(
      resolveGeoCountry({
        headers: headers({ "x-country-code": "ca" }),
      }),
    ).toBe("CA");
  });

  it("rejects XX and unknown codes without reading a later header", () => {
    expect(
      resolveGeoCountry({
        requestCfCountry: "XX",
        headers: headers({ "x-vercel-ip-country": "EG" }),
      }),
    ).toBeNull();
    expect(
      resolveGeoCountry({
        headers: headers({ "x-vercel-ip-country": "T1" }),
      }),
    ).toBeNull();
    expect(resolveGeoCountry({ headers: headers({}) })).toBeNull();
  });
});

describe("requestCfCountry", () => {
  it("reads request.cf.country and ignores a Request without cf", () => {
    const withCf = new Request("https://getqvi.com/api/geo") as Request & { cf?: { country?: string } };
    withCf.cf = { country: "EG" };
    expect(requestCfCountry(withCf)).toBe("EG");
    expect(requestCfCountry(new Request("https://getqvi.com/api/geo"))).toBeNull();
  });
});
