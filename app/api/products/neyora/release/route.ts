import { jsonResponse } from "@/lib/licensing/http";
import { fetchLatestPublicNeyoraRelease } from "@/lib/licensing/public-release";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = createServiceSupabaseClient();
  if (!client) {
    return jsonResponse({ release: null, error: "Not configured" }, 503);
  }

  const release = await fetchLatestPublicNeyoraRelease(client);
  return jsonResponse({ release });
}