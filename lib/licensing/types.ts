export type LicenseStatus = "active" | "expired" | "revoked";

export type LicenseTokenPayload = {
  sub?: string;
  product?: string;
  entitlements?: string[];
  device?: string;
  exp?: number;
  status?: string;
  maxDevices?: number;
};

export type LicenseActivateRequest = {
  productCode: string;
  licenseKey?: string | null;
  accessToken?: string | null;
  deviceFingerprint: string;
  deviceName?: string;
  appVersion?: string;
};

export type LicenseActivateResponse = {
  licenseToken?: string;
  expiresAt?: string;
  entitlements?: string[];
  maxDevices?: number;
  status?: string;
  error?: string;
  errorCode?: string;
};

export type LicenseValidateRequest = {
  licenseToken: string;
  deviceFingerprint: string;
  appVersion?: string;
};

export type LicenseValidateResponse = LicenseActivateResponse;

export type LicenseDeactivateRequest = {
  licenseToken: string;
  deviceFingerprint: string;
};

export type UpdateCheckResponse = {
  updateAvailable: boolean;
  latestVersion?: string;
  releaseNotes?: string;
  sha256?: string;
  downloadUrl?: string;
  channel?: "evaluation" | "stable" | "beta";
  fileSize?: number;
  mandatory?: boolean;
  minOsVersion?: string;
  error?: string;
};

export type LicenseRow = {
  id: string;
  user_id: string;
  product_id: string;
  license_key_hash: string;
  license_key_hint: string;
  status: LicenseStatus;
  max_devices: number;
  starts_at: string;
  expires_at: string | null;
};

export type LicenseProductRow = {
  id: string;
  code: string;
  name: string;
  max_devices_default: number;
  is_free: boolean;
  download_artifact_key: string | null;
};

export type LicenseDeviceRow = {
  id: string;
  license_id: string;
  device_fingerprint_hash: string;
  device_name: string | null;
  activated_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

export type LicenseReleaseRow = {
  id: string;
  product_code: string;
  version: string;
  channel: "evaluation" | "stable" | "beta";
  storage_path: string;
  sha256: string;
  release_notes: string | null;
  is_published: boolean;
  file_size?: number | null;
  mandatory?: boolean;
  min_os_version?: string | null;
};

export type PublicReleaseMetadata = {
  productCode: string;
  version: string;
  channel: "stable" | "beta" | "evaluation";
  sha256: string;
  releaseNotes: string | null;
  fileSize?: number;
  mandatory: boolean;
  minOsVersion?: string;
};