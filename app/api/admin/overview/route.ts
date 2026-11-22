import { fetchOverviewStats } from "@/lib/admin/overview";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { jsonResponse } from "@/lib/licensing/http";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const stats = await fetchOverviewStats(client);
  if (!stats.ok) return jsonResponse({ error: stats.error }, 500);
  return jsonResponse({ stats: stats.stats });
}