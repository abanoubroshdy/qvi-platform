import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/lib/i18n";
import { PRODUCT_CODES, type ProductCode } from "@/lib/licensing/products";
import { createLicenseForUser } from "@/lib/licensing/admin-actions";
import { maybeAutoEmailLicenseKey } from "@/lib/licensing/license-key-delivery";
import { computeTrialExpiresAt } from "@/lib/licensing/trial-settings";
import {
  evaluateTrialEligibility,
  trialErrorMessage,
  type TrialIneligibilityCode,
} from "@/lib/licensing/trial-eligibility";
import { formatLicenseKey } from "@/lib/licensing/license-key";

const TRAINING_CONSENT_VERSION = "2026-11-27-beta";

export type IssueTrialInput = {
  userId: string;
  productCode?: ProductCode;
  locale?: Locale;
  trainingMetadataConsent?: boolean;
  trainingAudioConsent?: boolean;
};

export type IssueTrialResult =
  | {
      ok: true;
      licenseId: string;
      licenseKey: string;
      licenseKeyFormatted: string;
      expiresAt: string;
    }
  | { ok: false; error: string; errorCode: TrialIneligibilityCode | "create_failed"; status: number };

export async function issueProductTrial(
  client: SupabaseClient,
  input: IssueTrialInput,
): Promise<IssueTrialResult> {
  const productCode = input.productCode ?? PRODUCT_CODES.neyoraPro;
  const locale: Locale = input.locale === "ar" ? "ar" : "en";

  const eligibility = await evaluateTrialEligibility(client, input.userId, productCode);
  if (!eligibility.eligible) {
    return {
      ok: false,
      error: trialErrorMessage(eligibility.code, locale),
      errorCode: eligibility.code,
      status: eligibility.code === "trial_disabled" ? 403 : 409,
    };
  }

  const expiresAt = computeTrialExpiresAt(eligibility.settings.duration_days);
  const created = await createLicenseForUser(client, {
    userId: input.userId,
    productCode,
    expiresAt,
    maxDevices: eligibility.settings.max_devices,
    isTrial: true,
  });

  if (!created.ok) {
    return { ok: false, error: created.error, errorCode: "create_failed", status: 400 };
  }

  await client.from("license_events").insert({
    license_id: created.licenseId,
    user_id: input.userId,
    event_type: "trial_activated",
    success: true,
    metadata: { productCode, durationDays: eligibility.settings.duration_days },
  });

  const wantsConsent =
    input.trainingMetadataConsent === true || input.trainingAudioConsent === true;
  if (wantsConsent) {
    await client
      .from("profiles")
      .update({
        training_consent_version: TRAINING_CONSENT_VERSION,
        training_metadata_consent: input.trainingMetadataConsent === true,
        training_audio_consent: input.trainingAudioConsent === true,
      })
      .eq("id", input.userId);
  }

  await maybeAutoEmailLicenseKey(client, created.licenseId, true, locale);

  return {
    ok: true,
    licenseId: created.licenseId,
    licenseKey: created.licenseKey,
    licenseKeyFormatted: formatLicenseKey(created.licenseKey),
    expiresAt,
  };
}