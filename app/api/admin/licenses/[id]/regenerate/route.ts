import { jsonResponse } from "@/lib/licensing/http";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { regenerateLicenseKey } from "@/lib/licensing/admin-actions";
import { formatLicenseKey } from "@/lib/licensing/license-key";
import { maybeAutoEmailLicenseKey } from "@/lib/licensing/license-key-delivery";
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

  let body: { emailKeyToUser?: boolean; locale?: string } = {};
  try {
    body = (await request.json()) as { emailKeyToUser?: boolean; locale?: string };
  } catch {
    body = {};
  }

  const { id } = await context.params;
  const result = await regenerateLicenseKey(client, {
    licenseId: id,
    actorUserId: guard.userId,
    actorEmail: guard.email,
    source: "admin",
  });

  if (!result.ok) return jsonResponse({ error: result.error }, 400);

  let emailWarning: string | undefined;
  if (body.emailKeyToUser !== false) {
    const emailed = await maybeAutoEmailLicenseKey(client, id, true, body.locale === "ar" ? "ar" : "en");
    if (!emailed.ok) emailWarning = emailed.warning;
  }

  return jsonResponse({
    ok: true,
    licenseKey: result.licenseKey,
    licenseKeyFormatted: formatLicenseKey(result.licenseKey),
    ...(emailWarning ? { emailWarning } : {}),
  });
}