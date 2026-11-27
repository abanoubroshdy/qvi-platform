import type { Locale } from "@/lib/i18n";

export const TRIAL_TRAINING_CONSENT_VERSION = "2026-11-27-beta";

export function isTrialTrainingConsentComplete(
  metadataConsent?: boolean,
  audioConsent?: boolean,
): boolean {
  return metadataConsent === true && audioConsent === true;
}

export type TrialConsentValidation =
  | { ok: true }
  | { ok: false; code: "consent_required" };

export function validateTrialTrainingConsent(
  metadataConsent?: boolean,
  audioConsent?: boolean,
): TrialConsentValidation {
  if (isTrialTrainingConsentComplete(metadataConsent, audioConsent)) return { ok: true };
  return { ok: false, code: "consent_required" };
}

export function trialConsentRequiredMessage(locale: Locale): string {
  if (locale === "ar") {
    return "يلزم الموافقة على مشاركة بيانات الأداء والمقاطع الصوتية القصيرة لتفعيل التجربة المجانية.";
  }
  return "You must agree to share performance metadata and short audio clips to start the free trial.";
}