import { describe, expect, it } from "vitest";
import {
  buildConsentPatch,
  hasConsentForModel,
  validateTrainingUploadRequest,
  type ProfileTrainingConsent,
} from "@/lib/neyora/telemetry/validation";
import { METADATA_MAX_BYTES, AUDIO_MAX_BYTES } from "@/lib/neyora/telemetry/constants";
import { buildTrainingSubmissionKey } from "@/lib/neyora/telemetry/r2-config";

const baseProfile: ProfileTrainingConsent = {
  training_metadata_consent: false,
  training_audio_consent: false,
  training_consent_version: null,
  training_consented_at: null,
  training_consent_updated_at: null,
};

describe("validateTrainingUploadRequest", () => {
  it("accepts metadata tier json within limit", () => {
    const result = validateTrainingUploadRequest({
      modelTarget: "lm",
      contentType: "application/json",
      sizeBytes: METADATA_MAX_BYTES,
      fileExtension: "json",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects rmvpe without audio content type", () => {
    const result = validateTrainingUploadRequest({
      modelTarget: "rmvpe",
      contentType: "application/json",
      sizeBytes: 100,
    });
    expect(result).toEqual({
      ok: false,
      error: "Content-Type is not allowed for this model.",
      errorCode: "invalid_content_type",
    });
  });

  it("rejects oversized audio", () => {
    const result = validateTrainingUploadRequest({
      modelTarget: "rmvpe",
      contentType: "audio/flac",
      sizeBytes: AUDIO_MAX_BYTES + 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("file_too_large");
  });

  it("rejects mismatched extension", () => {
    const result = validateTrainingUploadRequest({
      modelTarget: "composer",
      contentType: "application/json",
      sizeBytes: 10,
      fileExtension: "npz",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("invalid_extension");
  });
});

describe("hasConsentForModel", () => {
  it("requires metadata consent for lm", () => {
    expect(hasConsentForModel({ ...baseProfile, training_metadata_consent: true }, "lm")).toBe(true);
    expect(hasConsentForModel(baseProfile, "lm")).toBe(false);
  });

  it("requires audio consent for rmvpe", () => {
    expect(hasConsentForModel({ ...baseProfile, training_audio_consent: true }, "rmvpe")).toBe(true);
    expect(hasConsentForModel({ ...baseProfile, training_metadata_consent: true }, "rmvpe")).toBe(false);
  });
});

describe("buildConsentPatch", () => {
  it("sets consented_at on first opt-in", () => {
    const patch = buildConsentPatch(baseProfile, { training_metadata_consent: true });
    expect(patch.training_metadata_consent).toBe(true);
    expect(patch.training_consented_at).toBeTruthy();
    expect(patch.training_consent_updated_at).toBeTruthy();
  });

  it("clears version when fully revoked", () => {
    const patch = buildConsentPatch(
      {
        ...baseProfile,
        training_metadata_consent: true,
        training_consent_version: "v1",
        training_consented_at: "2020-01-01T00:00:00.000Z",
      },
      { training_metadata_consent: false },
    );
    expect(patch.training_metadata_consent).toBe(false);
    expect(patch.training_consent_version).toBeNull();
    expect(patch.training_consented_at).toBeNull();
  });
});

describe("buildTrainingSubmissionKey", () => {
  it("uses training-submissions prefix", () => {
    const key = buildTrainingSubmissionKey({
      modelTarget: "performer",
      userId: "11111111-1111-1111-1111-111111111111",
      submissionId: "22222222-2222-2222-2222-222222222222",
      contentType: "application/x-ndjson",
    });
    expect(key).toMatch(
      /^training-submissions\/performer\/\d{4}-\d{2}\/11111111-1111-1111-1111-111111111111\/22222222-2222-2222-2222-222222222222\.ndjson$/,
    );
  });
});