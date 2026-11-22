import { describe, expect, it, vi } from "vitest";
import {
  clampTrafficWindow,
  fetchTrafficSummary,
  formatGraphqlErrors,
  resolveCloudflareAnalyticsConfig,
} from "@/lib/admin/cloudflare-analytics";

describe("resolveCloudflareAnalyticsConfig", () => {
  it("returns null when any required variable is missing", () => {
    expect(
      resolveCloudflareAnalyticsConfig({
        CF_ANALYTICS_API_TOKEN: "token",
        CF_ACCOUNT_ID: "acct",
      }),
    ).toBeNull();
  });
});

describe("clampTrafficWindow", () => {
  it("shortens ranges longer than the max days", () => {
    const until = "2026-02-01T00:00:00.000Z";
    const since = "2025-12-01T00:00:00.000Z";
    const result = clampTrafficWindow(since, until, 31);
    expect(result.clamped).toBe(true);
    expect(new Date(result.until).getTime()).toBe(new Date(until).getTime());
    expect(new Date(result.until).getTime() - new Date(result.since).getTime()).toBeLessThanOrEqual(
      31 * 24 * 60 * 60 * 1000 + 1000,
    );
  });
});

describe("formatGraphqlErrors", () => {
  it("joins error messages", () => {
    expect(formatGraphqlErrors([{ message: "bad field" }, {}])).toEqual(["bad field", "Unknown GraphQL error."]);
  });
});

describe("fetchTrafficSummary", () => {
  it("returns unconfigured summary without calling fetch", async () => {
    const fetchImpl = vi.fn();
    const summary = await fetchTrafficSummary({ env: {}, fetchImpl });
    expect(summary.configured).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("parses RUM totals, top pages, and countries", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            viewer: {
              accounts: [
                {
                  totals: [{ count: 120, sum: { visits: 55 } }],
                  topPages: [
                    { count: 40, sum: { visits: 20 }, dimensions: { requestPath: "/" } },
                  ],
                  topCountries: [
                    { count: 30, sum: { visits: 15 }, dimensions: { countryName: "Egypt" } },
                  ],
                },
              ],
            },
          },
        }),
        { status: 200 },
      ),
    );

    const summary = await fetchTrafficSummary({
      env: {
        CF_ANALYTICS_API_TOKEN: "token",
        CF_ACCOUNT_ID: "acc",
        CF_WEB_ANALYTICS_SITE_TAG: "site",
      },
      fetchImpl,
      since: "2026-01-01T00:00:00.000Z",
      until: "2026-01-08T00:00:00.000Z",
    });

    expect(summary.configured).toBe(true);
    expect(summary.pageViews).toBe(120);
    expect(summary.visits).toBe(55);
    expect(summary.topPages[0]?.label).toBe("/");
    expect(summary.topCountries[0]?.label).toBe("Egypt");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("throws with GraphQL error text", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: "unknown field" }] }), { status: 200 }),
    );
    await expect(
      fetchTrafficSummary({
        env: {
          CF_ANALYTICS_API_TOKEN: "token",
          CF_ACCOUNT_ID: "acc",
          CF_WEB_ANALYTICS_SITE_TAG: "site",
        },
        fetchImpl,
      }),
    ).rejects.toThrow(/unknown field/);
  });
});