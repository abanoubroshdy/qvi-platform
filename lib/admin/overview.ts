import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardStats = {
  users: { total: number; new_7d: number; new_30d: number };
  licenses: Array<{
    product_code: string;
    product_name: string;
    status: string;
    count: number;
  }>;
  active_devices: number;
  qv1_downloads: { total: number; last_30d: number };
  recent_signups: Array<{ email: string | null; created_at: string }>;
};

export async function fetchOverviewStats(
  client: SupabaseClient,
): Promise<{ ok: true; stats: DashboardStats } | { ok: false; error: string }> {
  const { data, error } = await client.rpc("admin_dashboard_stats");
  if (error) return { ok: false, error: error.message };
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Invalid stats response." };
  }
  return { ok: true, stats: data as DashboardStats };
}