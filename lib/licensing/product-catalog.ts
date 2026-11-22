import type { SupabaseClient } from "@supabase/supabase-js";
import type { LicenseProductRow } from "@/lib/licensing/types";

export type LoadLicenseProductResult =
  | { ok: true; product: LicenseProductRow }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "query_error"; message: string; code?: string; details?: string; hint?: string };

function redactForLog(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/[\r\n]+/g, " ").slice(0, 240);
}

export async function loadLicenseProduct(
  client: SupabaseClient,
  productCode: string,
): Promise<LoadLicenseProductResult> {
  const { data, error } = await client
    .from("license_products")
    .select("*")
    .eq("code", productCode)
    .maybeSingle();

  if (error) {
    const message = redactForLog(error.message);
    const details = redactForLog(error.details ?? undefined);
    const hint = redactForLog(error.hint ?? undefined);
    console.error(
      `[license] loadProduct failed code=${productCode} status=${error.code ?? "unknown"} message=${message} details=${details} hint=${hint}`,
    );
    return {
      ok: false,
      reason: "query_error",
      message: error.message,
      code: error.code,
      details: error.details ?? undefined,
      hint: error.hint ?? undefined,
    };
  }

  if (!data) {
    return { ok: false, reason: "not_found" };
  }

  return { ok: true, product: data as LicenseProductRow };
}