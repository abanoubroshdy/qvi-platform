import { parsePaginationFromUrl } from "@/lib/admin/pagination";
import { jsonResponse } from "@/lib/licensing/http";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const url = new URL(request.url);
  const failedOnly = url.searchParams.get("failed") === "1";
  const successParam = url.searchParams.get("success");
  const eventType = url.searchParams.get("event_type")?.trim();
  const productId = url.searchParams.get("product_id")?.trim();
  const since = url.searchParams.get("since")?.trim();
  const until = url.searchParams.get("until")?.trim();
  const { limit, offset } = parsePaginationFromUrl(url);

  let query = client
    .from("license_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (failedOnly) query = query.eq("success", false);
  else if (successParam === "true") query = query.eq("success", true);
  else if (successParam === "false") query = query.eq("success", false);

  if (eventType) query = query.eq("event_type", eventType);
  if (productId) query = query.eq("product_id", productId);
  if (since) query = query.gte("created_at", since);
  if (until) query = query.lte("created_at", until);

  const { data, error, count } = await query;
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ events: data ?? [], total: count ?? 0, limit, offset });
}