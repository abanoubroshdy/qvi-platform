import { jsonResponse } from "@/lib/licensing/http";
import {
  countRecentOwnerRegenerations,
  ownerRegenerateRateLimited,
  regenerateLicenseKey,
} from "@/lib/licensing/admin-actions";
import { formatLicenseKey } from "@/lib/licensing/license-key";
import { getRequestSupabaseSession } from "@/lib/supabase/request-session";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getRequestSupabaseSession(request);
  if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

  const service = createServiceSupabaseClient();
  if (!service) return jsonResponse({ error: "Not configured" }, 503);

  const { id } = await context.params;
  const { data: license } = await service
    .from("licenses")
    .select("id, user_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!license) return jsonResponse({ error: "License not found." }, 404);
  if (license.user_id !== session.userId) return jsonResponse({ error: "Forbidden" }, 403);
  if (license.status !== "active") return jsonResponse({ error: "Only active licenses can get a new key." }, 400);

  const recent = await countRecentOwnerRegenerations(service, id, session.userId);
  if (ownerRegenerateRateLimited(recent)) {
    return jsonResponse({ error: "Too many key resets. Try again later.", errorCode: "rate_limited" }, 429);
  }

  const result = await regenerateLicenseKey(service, {
    licenseId: id,
    actorUserId: session.userId,
    source: "owner",
  });

  if (!result.ok) return jsonResponse({ error: result.error }, 400);

  return jsonResponse({
    ok: true,
    licenseKey: result.licenseKey,
    licenseKeyFormatted: formatLicenseKey(result.licenseKey),
  });
}