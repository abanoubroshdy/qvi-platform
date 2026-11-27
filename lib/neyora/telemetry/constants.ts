export const NEYORA_TRAINING_CONSENT_VERSION = "2026-11-27-beta";

export const NEYORA_MODEL_TARGETS = ["lm", "composer", "performer", "rmvpe"] as const;
export type NeyoraModelTarget = (typeof NEYORA_MODEL_TARGETS)[number];

export const METADATA_MODEL_TARGETS: readonly NeyoraModelTarget[] = ["lm", "composer", "performer"];
export const AUDIO_MODEL_TARGETS: readonly NeyoraModelTarget[] = ["rmvpe"];

export const METADATA_MAX_BYTES = 2 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 10 * 1024 * 1024;

export const METADATA_CONTENT_TYPES = [
  "application/json",
  "application/x-ndjson",
  "application/octet-stream",
] as const;

export const AUDIO_CONTENT_TYPES = ["audio/ogg", "audio/flac"] as const;

export const TELEMETRY_PRESIGN_SECONDS = 10 * 60;

/** Max upload-url requests per user per UTC day. */
export const TELEMETRY_DAILY_UPLOAD_QUOTA = 100;

export const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "application/json": "json",
  "application/x-ndjson": "ndjson",
  "application/octet-stream": "npz",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
};