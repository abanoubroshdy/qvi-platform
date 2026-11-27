import { requireSiteAdmin } from "@/lib/admin/guard";
import { jsonResponse } from "@/lib/licensing/http";
import { PRODUCT_CODES } from "@/lib/licensing/products";
import { validateTrialSettingsPatch } from "@/lib/licensing/trial-settings";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const DEFAULT_PRODUCT = PRODUCT_CODES.neyoraPro;

export async function GET(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const url = new URL(request.url);
  const productCode = url.searchParams.get("product")?.trim() || DEFAULT_PRODUCT;

  const { data, error } = await client
    .from("product_trial_settings")
    .select("product_code, enabled, duration_days, max_devices, updated_at, updated_by")
    .eq("product_code", productCode)
    .maybeSingle();

  if (error) return jsonResponse({ error: error.message }, 500);
  if (!data) return jsonResponse({ error: "Trial settings not found." }, 404);

  return jsonResponse({ settings: data });
}

export async function PATCH(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const url = new URL(request.url);
  const productCode = url.searchParams.get("product")?.trim() || DEFAULT_PRODUCT;

  let body: { enabled?: boolean; duration_days?: number; max_devices?: number } = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid body" }, 400);
  }

  const { data: current, error: fetchError } = await client
    .from("product_trial_settings")
    .select("enabled, duration_days, max_devices")
    .eq("product_code", productCode)
    .maybeSingle();

  if (fetchError) return jsonResponse({ error: fetchError.message }, 500);
  if (!current) return jsonResponse({ error: "Trial settings not found." }, 404);

  const validated = validateTrialSettingsPatch(body, current);
  if (!validated.ok) return jsonResponse({ error: validated.error }, 400);

  const { error: updateError, data: updated } = await client
    .from("product_trial_settings")
    .update({
      ...validated.patch,
      updated_at: new Date().toISOString(),
      updated_by: guard.userId,
    })
    .eq("product_code", productCode)
    .select("product_code, enabled, duration_days, max_devices, updated_at, updated_by")
    .single();

  if (updateError) return jsonResponse({ error: updateError.message }, 500);

  return jsonResponse({ settings: updated });
}