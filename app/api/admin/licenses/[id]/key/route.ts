import { jsonResponse } from "@/lib/licensing/http";
import {
  countRecentLicenseEvents,
  isRevealRateLimited,
  logLicenseKeyEvent,
  revealStoredLicenseKey,
} from "@/lib/licensing/license-key-access";
import { requireSiteAdmin } from "@/lib/admin/guard";
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
  const reveal = await revealStoredLicenseKey(client, id);
  if (!reveal.ok) {
    if (reveal.reason === "legacy") {
      return jsonResponse(
        { error: "This license has no stored key. Regenerate the key to view it.", code: "legacy" },
        404,
      );
    }
    const status = reveal.reason === "not_configured" ? 503 : reveal.reason === "not_found" ? 404 : 400;
    return jsonResponse({ error: "License key unavailable.", code: reveal.reason }, status);
  }

  const { data: row } = await client.from("licenses").select("user_id, product_id, status").eq("id", id).maybeSingle();
  if (!row || row.status !== "active") return jsonResponse({ error: "License not active." }, 400);

  const recent = await countRecentLicenseEvents(client, id, "license_key_revealed");
  if (isRevealRateLimited(recent)) return jsonResponse({ error: "Too many requests.", code: "rate_limited" }, 429);

  await logLicenseKeyEvent(client, {
    licenseId: id,
    userId: row.user_id,
    productId: row.product_id,
    eventType: "license_key_revealed",
    metadata: { source: "admin", actor: guard.email },
  });

  return jsonResponse({ ok: true, licenseKeyFormatted: reveal.licenseKeyFormatted });
}