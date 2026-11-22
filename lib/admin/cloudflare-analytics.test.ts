import { describe, expect, it, vi } from "vitest";
import { fetchTrafficSummary, resolveCloudflareAnalyticsConfig } from "@/lib/admin/cloudflare-analytics";

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

describe("fetchTrafficSummary", () => {
  it("returns unconfigured summary without calling fetch", async () => {
    const fetchImpl = vi.fn();
    const summary = await fetchTrafficSummary({ env: {}, fetchImpl });
    expect(summary.configured).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("parses visits from a successful GraphQL response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            viewer: {
              accounts: [{ webAnalyticsSites: [{ total: { visits: 42 } }] }],
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
    expect(summary.visits).toBe(42);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});