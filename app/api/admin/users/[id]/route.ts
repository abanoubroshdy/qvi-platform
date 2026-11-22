import { fetchAdminUserDetail } from "@/lib/admin/users";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { jsonResponse } from "@/lib/licensing/http";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const { id } = await context.params;
  const detail = await fetchAdminUserDetail(client, id);
  if (!detail.ok) return jsonResponse({ error: detail.error }, 404);
  return jsonResponse({ user: detail.user });
}