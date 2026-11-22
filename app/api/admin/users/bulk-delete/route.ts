import { BULK_DELETE_MAX, hardDeleteUsersBulk } from "@/lib/admin/user-delete";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { jsonResponse } from "@/lib/licensing/http";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  let body: { ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid body" }, 400);
  }

  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) {
    return jsonResponse({ error: "No user ids provided." }, 400);
  }
  if (ids.length > BULK_DELETE_MAX) {
    return jsonResponse({ error: `At most ${BULK_DELETE_MAX} users per request.` }, 400);
  }

  const result = await hardDeleteUsersBulk(client, {
    actorUserId: guard.userId,
    actorEmail: guard.email,
    targetUserIds: ids,
  });

  return jsonResponse({
    deleted: result.deleted,
    failed: result.failed,
    deletedCount: result.deleted.length,
    failedCount: result.failed.length,
  });
}