import { describe, expect, it } from "vitest";
import { fetchOverviewStats } from "@/lib/admin/overview";

describe("fetchOverviewStats", () => {
  it("returns stats from the admin_dashboard_stats RPC", async () => {
    const stats = {
      users: { total: 3, new_7d: 1, new_30d: 2 },
      licenses: [],
      active_devices: 0,
      qv1_downloads: { total: 1, last_30d: 1 },
      recent_signups: [{ email: "ada@studio.com", created_at: "2026-01-01T00:00:00Z" }],
    };

    const client = {
      rpc: async (name: string) => {
        expect(name).toBe("admin_dashboard_stats");
        return { data: stats, error: null };
      },
    };

    const result = await fetchOverviewStats(client as never);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.users.total).toBe(3);
    }
  });

  it("surfaces RPC errors", async () => {
    const client = {
      rpc: async () => ({ data: null, error: { message: "boom" } }),
    };
    const result = await fetchOverviewStats(client as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("boom");
  });
});