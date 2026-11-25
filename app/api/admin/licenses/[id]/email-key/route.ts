import type { Locale } from "@/lib/i18n";
import { jsonResponse } from "@/lib/licensing/http";
import { emailLicenseKeyToOwner } from "@/lib/licensing/license-key-delivery";
import { requireSiteAdmin } from "@/lib/admin/guard";
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

  let body: { locale?: string } = {};
  try {
    body = (await request.json()) as { locale?: string };
  } catch {
    body = {};
  }
  const locale: Locale | undefined = body.locale === "ar" ? "ar" : body.locale === "en" ? "en" : undefined;

  const { id } = await context.params;
  const result = await emailLicenseKeyToOwner(client, id, { locale, actor: "admin" });
  if (!result.ok) return jsonResponse({ error: result.error, code: result.code }, result.status);
  return jsonResponse({ ok: true });
}