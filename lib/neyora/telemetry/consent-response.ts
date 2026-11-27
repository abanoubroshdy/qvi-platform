import type { ProfileTrainingConsent } from "@/lib/neyora/telemetry/validation";
import { NEYORA_TRAINING_CONSENT_VERSION } from "@/lib/neyora/telemetry/constants";

export type TelemetryConsentResponse = {
  training_metadata_consent: boolean;
  training_audio_consent: boolean;
  training_consent_version: string | null;
  training_consented_at: string | null;
  training_consent_updated_at: string | null;
  current_consent_version: string;
};

export function toConsentResponse(row: ProfileTrainingConsent | null): TelemetryConsentResponse {
  return {
    training_metadata_consent: row?.training_metadata_consent ?? false,
    training_audio_consent: row?.training_audio_consent ?? false,
    training_consent_version: row?.training_consent_version ?? null,
    training_consented_at: row?.training_consented_at ?? null,
    training_consent_updated_at: row?.training_consent_updated_at ?? null,
    current_consent_version: NEYORA_TRAINING_CONSENT_VERSION,
  };
}