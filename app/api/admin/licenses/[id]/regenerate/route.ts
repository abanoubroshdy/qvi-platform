import { jsonResponse } from "@/lib/licensing/http";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { regenerateLicenseKey } from "@/lib/licensing/admin-actions";
import { formatLicenseKey } from "@/lib/licensing/license-key";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const { id } = await context.params;
  const result = await regenerateLicenseKey(client, {
    licenseId: id,
    actorUserId: guard.userId,
    actorEmail: guard.email,
    source: "admin",
  });

  if (!result.ok) return jsonResponse({ error: result.error }, 400);

  return jsonResponse({
    ok: true,
    licenseKey: result.licenseKey,
    licenseKeyFormatted: formatLicenseKey(result.licenseKey),
  });
}