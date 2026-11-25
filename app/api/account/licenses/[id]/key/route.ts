import { jsonResponse } from "@/lib/licensing/http";
import { getLicenseKeyForOwner } from "@/lib/licensing/license-key-delivery";
import { getRequestSupabaseSession } from "@/lib/supabase/request-session";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getRequestSupabaseSession(request);
  if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

  const service = createServiceSupabaseClient();
  if (!service) return jsonResponse({ error: "Not configured" }, 503);

  const { id } = await context.params;
  const result = await getLicenseKeyForOwner(service, id, session.userId);
  if (!result.ok) {
    return jsonResponse({ error: result.error, code: result.code }, result.status);
  }

  return jsonResponse({ ok: true, licenseKeyFormatted: result.licenseKeyFormatted });
}