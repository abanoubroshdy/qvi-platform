import {
  AUDIO_CONTENT_TYPES,
  AUDIO_MAX_BYTES,
  AUDIO_MODEL_TARGETS,
  METADATA_CONTENT_TYPES,
  METADATA_MAX_BYTES,
  METADATA_MODEL_TARGETS,
  NEYORA_MODEL_TARGETS,
  type NeyoraModelTarget,
} from "@/lib/neyora/telemetry/constants";

export type UploadValidationResult =
  | { ok: true; modelTarget: NeyoraModelTarget; contentType: string; sizeBytes: number }
  | { ok: false; error: string; errorCode: string };

export function isNeyoraModelTarget(value: string): value is NeyoraModelTarget {
  return (NEYORA_MODEL_TARGETS as readonly string[]).includes(value);
}

export function modelRequiresAudioConsent(modelTarget: NeyoraModelTarget): boolean {
  return (AUDIO_MODEL_TARGETS as readonly string[]).includes(modelTarget);
}

export function modelRequiresMetadataConsent(modelTarget: NeyoraModelTarget): boolean {
  return (METADATA_MODEL_TARGETS as readonly string[]).includes(modelTarget);
}

export function validateTrainingUploadRequest(input: {
  modelTarget: string;
  contentType: string;
  sizeBytes: number;
  fileExtension?: string | null;
}): UploadValidationResult {
  const modelTarget = input.modelTarget.trim();
  if (!isNeyoraModelTarget(modelTarget)) {
    return { ok: false, error: "Unknown model target.", errorCode: "invalid_model_target" };
  }

  const contentType = input.contentType.trim().toLowerCase();
  if (!contentType) {
    return { ok: false, error: "Content-Type is required.", errorCode: "invalid_content_type" };
  }

  const sizeBytes = input.sizeBytes;
  if (!Number.isFinite(sizeBytes) || sizeBytes < 1 || !Number.isInteger(sizeBytes)) {
    return { ok: false, error: "size_bytes must be a positive integer.", errorCode: "invalid_size" };
  }

  const isAudio = modelRequiresAudioConsent(modelTarget);
  const allowedTypes = isAudio ? AUDIO_CONTENT_TYPES : METADATA_CONTENT_TYPES;
  const maxBytes = isAudio ? AUDIO_MAX_BYTES : METADATA_MAX_BYTES;

  if (!(allowedTypes as readonly string[]).includes(contentType)) {
    return { ok: false, error: "Content-Type is not allowed for this model.", errorCode: "invalid_content_type" };
  }

  if (sizeBytes > maxBytes) {
    return { ok: false, error: "File exceeds the size limit for this tier.", errorCode: "file_too_large" };
  }

  const ext = input.fileExtension?.trim().toLowerCase().replace(/^\./, "") ?? "";
  if (ext) {
    const expectedByType: Record<string, string[]> = {
      "application/json": ["json"],
      "application/x-ndjson": ["ndjson", "jsonl"],
      "application/octet-stream": ["npz", "bin"],
      "audio/ogg": ["ogg", "oga"],
      "audio/flac": ["flac"],
    };
    const allowedExt = expectedByType[contentType];
    if (allowedExt && !allowedExt.includes(ext)) {
      return { ok: false, error: "File extension does not match Content-Type.", errorCode: "invalid_extension" };
    }
  }

  return { ok: true, modelTarget, contentType, sizeBytes };
}

export type ProfileTrainingConsent = {
  training_metadata_consent: boolean;
  training_audio_consent: boolean;
  training_consent_version: string | null;
  training_consented_at: string | null;
  training_consent_updated_at: string | null;
};

export function hasConsentForModel(
  profile: Pick<ProfileTrainingConsent, "training_metadata_consent" | "training_audio_consent">,
  modelTarget: NeyoraModelTarget,
): boolean {
  if (modelRequiresAudioConsent(modelTarget)) return profile.training_audio_consent === true;
  return profile.training_metadata_consent === true;
}

export type ConsentUpdateInput = {
  training_metadata_consent?: boolean;
  training_audio_consent?: boolean;
  training_consent_version?: string;
};

export function buildConsentPatch(
  current: ProfileTrainingConsent,
  input: ConsentUpdateInput,
): Partial<ProfileTrainingConsent> & { training_consent_updated_at: string } {
  const now = new Date().toISOString();
  const nextMetadata = input.training_metadata_consent ?? current.training_metadata_consent;
  const nextAudio = input.training_audio_consent ?? current.training_audio_consent;
  const version = input.training_consent_version?.trim();

  const patch: Partial<ProfileTrainingConsent> & { training_consent_updated_at: string } = {
    training_metadata_consent: nextMetadata,
    training_audio_consent: nextAudio,
    training_consent_updated_at: now,
  };

  const optedIn = nextMetadata || nextAudio;
  const wasOptedIn = current.training_metadata_consent || current.training_audio_consent;

  if (optedIn) {
    patch.training_consent_version = version || current.training_consent_version || null;
    if (!wasOptedIn || !current.training_consented_at) {
      patch.training_consented_at = now;
    }
  } else {
    patch.training_consent_version = null;
    patch.training_consented_at = null;
  }

  return patch;
}