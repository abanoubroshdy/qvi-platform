import { banUser } from "@/lib/admin/users";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { jsonResponse } from "@/lib/licensing/http";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  if (guard.userId === id) {
    return jsonResponse({ error: "You cannot ban your own account." }, 400);
  }

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);
  const result = await banUser(client, id);
  if (!result.ok) return jsonResponse({ error: result.error }, 400);
  return jsonResponse({ ok: true });
}