import { fetchTrafficSummary } from "@/lib/admin/cloudflare-analytics";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { jsonResponse } from "@/lib/licensing/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const since = url.searchParams.get("since")?.trim() || undefined;
  const until = url.searchParams.get("until")?.trim() || undefined;

  try {
    const traffic = await fetchTrafficSummary({ since, until });
    return jsonResponse({ traffic });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Traffic fetch failed.";
    return jsonResponse({ error: message }, 502);
  }
}