import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductCode } from "@/lib/licensing/products";
import type { ProductTrialSettingsRow } from "@/lib/licensing/trial-settings";

export type TrialIneligibilityCode =
  | "trial_disabled"
  | "already_claimed"
  | "already_licensed"
  | "unknown_product"
  | "settings_missing";

export type TrialEligibilityOutcome =
  | { eligible: true; settings: ProductTrialSettingsRow }
  | { eligible: false; code: TrialIneligibilityCode };

export async function evaluateTrialEligibility(
  client: SupabaseClient,
  userId: string,
  productCode: ProductCode,
): Promise<TrialEligibilityOutcome> {
  const { data: settings, error: settingsError } = await client
    .from("product_trial_settings")
    .select("product_code, enabled, duration_days, max_devices, updated_at, updated_by")
    .eq("product_code", productCode)
    .maybeSingle();

  if (settingsError || !settings) {
    return { eligible: false, code: "settings_missing" };
  }
  if (!settings.enabled) {
    return { eligible: false, code: "trial_disabled" };
  }

  const { data: product } = await client
    .from("license_products")
    .select("id")
    .eq("code", productCode)
    .maybeSingle();
  if (!product) return { eligible: false, code: "unknown_product" };

  const { data: priorTrial } = await client
    .from("licenses")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", product.id)
    .eq("is_trial", true)
    .limit(1)
    .maybeSingle();
  if (priorTrial) return { eligible: false, code: "already_claimed" };

  const nowIso = new Date().toISOString();
  const { data: activeLicense } = await client
    .from("licenses")
    .select("id, status, expires_at")
    .eq("user_id", userId)
    .eq("product_id", product.id)
    .eq("status", "active")
    .limit(20);

  const hasActive = (activeLicense ?? []).some(
    (row) => !row.expires_at || row.expires_at > nowIso,
  );
  if (hasActive) return { eligible: false, code: "already_licensed" };

  return { eligible: true, settings: settings as ProductTrialSettingsRow };
}

export function trialErrorMessage(
  code: TrialIneligibilityCode,
  locale: "en" | "ar",
): string {
  const messages: Record<TrialIneligibilityCode, { en: string; ar: string }> = {
    trial_disabled: {
      en: "Free trials are not available right now.",
      ar: "التجربة المجانية غير متاحة حالياً.",
    },
    already_claimed: {
      en: "You have already used your free trial for this product.",
      ar: "لقد استخدمت التجربة المجانية لهذا المنتج مسبقاً.",
    },
    already_licensed: {
      en: "You already have an active license for this product.",
      ar: "لديك ترخيص نشط لهذا المنتج بالفعل.",
    },
    unknown_product: {
      en: "Unknown product.",
      ar: "منتج غير معروف.",
    },
    settings_missing: {
      en: "Trial settings are not configured.",
      ar: "إعدادات التجربة غير مهيأة.",
    },
  };
  return messages[code][locale];
}