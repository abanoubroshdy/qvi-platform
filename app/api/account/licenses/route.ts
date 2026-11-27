import { jsonResponse } from "@/lib/licensing/http";
import { getRequestSupabaseSession } from "@/lib/supabase/request-session";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { fetchUserLicenses } from "@/lib/supabase/licensing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getRequestSupabaseSession(request);
  if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

  const service = createServiceSupabaseClient();
  if (!service) return jsonResponse({ error: "Not configured" }, 503);

  const result = await fetchUserLicenses(service, session.userId);
  if (result.error) return jsonResponse({ error: result.error }, 500);

  return jsonResponse({ licenses: result.rows });
}