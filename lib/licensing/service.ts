import type { SupabaseClient, User } from "@supabase/supabase-js";
import { entitlementsForProduct, isProductCode } from "@/lib/licensing/products";
import {
  deviceFingerprintsMatch,
  signLicenseToken,
  licenseSigningKeyFromEnv,
  verifyLicenseToken,
} from "@/lib/licensing/jwt";
import { hashLicenseKey } from "@/lib/licensing/license-key";
import { loadLicenseProduct } from "@/lib/licensing/product-catalog";
import type {
  LicenseActivateResponse,
  LicenseRow,
  LicenseStatus,
  LicenseValidateResponse,
} from "@/lib/licensing/types";

type RequestMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

function effectiveLicenseStatus(row: LicenseRow): LicenseStatus {
  if (row.status === "revoked") return "revoked";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return "expired";
  return row.status === "expired" ? "expired" : "active";
}

async function logEvent(
  client: SupabaseClient,
  input: {
    licenseId?: string | null;
    userId?: string | null;
    productId?: string | null;
    eventType: string;
    deviceFingerprintHash?: string;
    success: boolean;
    errorCode?: string;
    meta?: RequestMeta;
    metadata?: Record<string, unknown>;
  },
) {
  await client.from("license_events").insert({
    license_id: input.licenseId ?? null,
    user_id: input.userId ?? null,
    product_id: input.productId ?? null,
    event_type: input.eventType,
    device_fingerprint_hash: input.deviceFingerprintHash ?? null,
    ip_address: input.meta?.ip ?? null,
    user_agent: input.meta?.userAgent ?? null,
    success: input.success,
    error_code: input.errorCode ?? null,
    metadata: input.metadata ?? {},
  });
}

function errorResponse(
  errorCode: string,
  error: string,
  httpStatus = 403,
): { body: LicenseActivateResponse; status: number } {
  return {
    status: httpStatus,
    body: { error, errorCode, status: errorCode === "revoked" ? "revoked" : errorCode === "expired" ? "expired" : undefined },
  };
}

async function resolveUserFromAccessToken(
  client: SupabaseClient,
  accessToken: string,
): Promise<User | null> {
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}

async function findLicenseForActivation(
  client: SupabaseClient,
  productId: string,
  userId: string | null,
  licenseKey: string | null,
): Promise<LicenseRow | null> {
  if (licenseKey) {
    const hash = await hashLicenseKey(licenseKey);
    const { data } = await client
      .from("licenses")
      .select("*")
      .eq("license_key_hash", hash)
      .eq("product_id", productId)
      .maybeSingle();
    return (data as LicenseRow | null) ?? null;
  }
  if (!userId) return null;
  const { data } = await client
    .from("licenses")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as LicenseRow | null) ?? null;
}

type RegisterDeviceResult =
  | { ok: true }
  | { ok: false; errorCode: "device_limit" | "invalid_license" | "catalog_error"; error: string };

async function registerLicenseDevice(
  client: SupabaseClient,
  licenseId: string,
  fingerprint: string,
  deviceName: string | undefined,
): Promise<RegisterDeviceResult> {
  const { data, error } = await client.rpc("register_license_device", {
    p_license_id: licenseId,
    p_fingerprint: fingerprint,
    p_device_name: deviceName ?? null,
  });

  if (error) {
    return {
      ok: false,
      errorCode: "catalog_error",
      error: "License service is temporarily unavailable.",
    };
  }

  const outcome = typeof data === "string" ? data : "";
  if (outcome === "ok") return { ok: true };
  if (outcome === "device_limit") {
    return {
      ok: false,
      errorCode: "device_limit",
      error: "Device limit reached. Deactivate another device on getqvi.com.",
    };
  }
  if (outcome === "invalid_license" || outcome === "invalid_fingerprint") {
    return {
      ok: false,
      errorCode: "invalid_license",
      error: "Could not register device.",
    };
  }
  return {
    ok: false,
    errorCode: "catalog_error",
    error: "License service is temporarily unavailable.",
  };
}

type TokenBuildFailure = { kind: "error"; error: string; httpStatus: number };

async function buildSuccessToken(
  client: SupabaseClient,
  license: LicenseRow,
  productCode: string,
  fingerprint: string,
  status: LicenseStatus,
): Promise<LicenseActivateResponse | TokenBuildFailure> {
  void client;
  const privateKey = licenseSigningKeyFromEnv();
  if (!privateKey) {
    return { kind: "error", error: "License signing is not configured.", httpStatus: 503 };
  }
  const entitlements = isProductCode(productCode) ? entitlementsForProduct(productCode) : [];
  const expiresAt = license.expires_at ? new Date(license.expires_at) : null;
  const token = await signLicenseToken(
    {
      licenseId: license.id,
      productCode,
      entitlements,
      deviceFingerprintHash: fingerprint,
      status,
      maxDevices: license.max_devices,
      expiresAt,
    },
    privateKey,
  );
  return {
    licenseToken: token,
    expiresAt: expiresAt?.toISOString(),
    entitlements,
    maxDevices: license.max_devices,
    status,
  };
}

export async function activateLicense(
  client: SupabaseClient,
  input: {
    productCode: string;
    licenseKey?: string | null;
    accessToken?: string | null;
    deviceFingerprint: string;
    deviceName?: string;
    appVersion?: string;
  },
  meta: RequestMeta,
): Promise<{ body: LicenseActivateResponse; status: number }> {
  if (!input.deviceFingerprint?.trim()) {
    return { status: 400, body: { error: "deviceFingerprint is required.", errorCode: "invalid_request" } };
  }
  if (!isProductCode(input.productCode)) {
    return { status: 400, body: { error: "Unknown product.", errorCode: "invalid_product" } };
  }

  const productResult = await loadLicenseProduct(client, input.productCode);
  if (!productResult.ok && productResult.reason === "query_error") {
    return {
      status: 503,
      body: {
        error: "License catalog is temporarily unavailable.",
        errorCode: "catalog_error",
      },
    };
  }
  if (!productResult.ok) {
    return { status: 400, body: { error: "Unknown product.", errorCode: "invalid_product" } };
  }
  const product = productResult.product;

  let userId: string | null = null;
  if (input.accessToken?.trim()) {
    const user = await resolveUserFromAccessToken(client, input.accessToken.trim());
    if (!user) {
      await logEvent(client, {
        productId: product.id,
        eventType: "activate",
        deviceFingerprintHash: input.deviceFingerprint,
        success: false,
        errorCode: "invalid_session",
        meta,
      });
      return { status: 401, body: { error: "Invalid access token.", errorCode: "invalid_session" } };
    }
    userId = user.id;
  }

  if (!input.licenseKey?.trim() && !userId) {
    return {
      status: 401,
      body: { error: "Provide licenseKey or accessToken.", errorCode: "invalid_key" },
    };
  }

  const license = await findLicenseForActivation(
    client,
    product.id,
    userId,
    input.licenseKey?.trim() ?? null,
  );

  if (!license) {
    await logEvent(client, {
      userId,
      productId: product.id,
      eventType: "activate",
      deviceFingerprintHash: input.deviceFingerprint,
      success: false,
      errorCode: "invalid_key",
      meta,
      metadata: { appVersion: input.appVersion },
    });
    const fail = errorResponse("invalid_key", "Invalid license key.", 403);
    return { status: fail.status, body: fail.body };
  }

  if (userId && license.user_id !== userId && input.licenseKey) {
    const fail = errorResponse("invalid_key", "Invalid license key.", 403);
    return { status: fail.status, body: fail.body };
  }

  const status = effectiveLicenseStatus(license);
  if (status === "revoked") {
    await logEvent(client, {
      licenseId: license.id,
      userId: license.user_id,
      productId: product.id,
      eventType: "activate",
      deviceFingerprintHash: input.deviceFingerprint,
      success: false,
      errorCode: "revoked",
      meta,
    });
    const fail = errorResponse("revoked", "This license was revoked.");
    return { status: fail.status, body: fail.body };
  }
  if (status === "expired") {
    await logEvent(client, {
      licenseId: license.id,
      userId: license.user_id,
      productId: product.id,
      eventType: "activate",
      deviceFingerprintHash: input.deviceFingerprint,
      success: false,
      errorCode: "expired",
      meta,
    });
    const fail = errorResponse("expired", "This license has expired.");
    return { status: fail.status, body: fail.body };
  }

  const deviceResult = await registerLicenseDevice(
    client,
    license.id,
    input.deviceFingerprint.trim(),
    input.deviceName?.trim(),
  );
  if (!deviceResult.ok) {
    await logEvent(client, {
      licenseId: license.id,
      userId: license.user_id,
      productId: product.id,
      eventType: "activate",
      deviceFingerprintHash: input.deviceFingerprint,
      success: false,
      errorCode: deviceResult.errorCode,
      meta,
    });
    const status = deviceResult.errorCode === "catalog_error" ? 503 : 403;
    return {
      status,
      body: { error: deviceResult.error, errorCode: deviceResult.errorCode },
    };
  }

  const tokenBody = await buildSuccessToken(
    client,
    license,
    input.productCode,
    input.deviceFingerprint.trim(),
    "active",
  );
  if ("kind" in tokenBody && tokenBody.kind === "error") {
    return { status: tokenBody.httpStatus, body: { error: tokenBody.error } };
  }

  await logEvent(client, {
    licenseId: license.id,
    userId: license.user_id,
    productId: product.id,
    eventType: "activate",
    deviceFingerprintHash: input.deviceFingerprint,
    success: true,
    meta,
    metadata: { appVersion: input.appVersion },
  });

  return { status: 200, body: tokenBody as LicenseActivateResponse };
}

export async function validateLicense(
  client: SupabaseClient,
  input: {
    licenseToken: string;
    deviceFingerprint: string;
    appVersion?: string;
  },
  meta: RequestMeta,
): Promise<{ body: LicenseValidateResponse; status: number }> {
  const verified = verifyLicenseToken(input.licenseToken);
  if (!verified.ok) {
    return {
      status: verified.errorCode === "expired" ? 403 : 401,
      body: { error: verified.error, errorCode: verified.errorCode },
    };
  }

  const payload = verified.payload;
  if (!deviceFingerprintsMatch(payload.device ?? "", input.deviceFingerprint)) {
    return {
      status: 403,
      body: { error: "Device not registered for this license.", errorCode: "device_limit" },
    };
  }

  const { data: license } = await client.from("licenses").select("*").eq("id", payload.sub).maybeSingle();
  if (!license) {
    return { status: 403, body: { error: "License not found.", errorCode: "invalid_token" } };
  }

  const { data: product } = await client
    .from("license_products")
    .select("*")
    .eq("id", license.product_id)
    .maybeSingle();

  const productCode = product?.code ?? payload.product ?? "";
  if (!isProductCode(productCode)) {
    return { status: 403, body: { error: "Unknown product.", errorCode: "invalid_product" } };
  }

  const status = effectiveLicenseStatus(license as LicenseRow);
  if (status === "revoked") {
    await logEvent(client, {
      licenseId: license.id,
      userId: license.user_id,
      productId: license.product_id,
      eventType: "validate",
      deviceFingerprintHash: input.deviceFingerprint,
      success: false,
      errorCode: "revoked",
      meta,
    });
    const fail = errorResponse("revoked", "This license was revoked.");
    return { status: fail.status, body: fail.body };
  }
  if (status === "expired") {
    await logEvent(client, {
      licenseId: license.id,
      userId: license.user_id,
      productId: license.product_id,
      eventType: "validate",
      deviceFingerprintHash: input.deviceFingerprint,
      success: false,
      errorCode: "expired",
      meta,
    });
    const fail = errorResponse("expired", "This license has expired.");
    return { status: fail.status, body: fail.body };
  }

  const { data: device } = await client
    .from("license_devices")
    .select("*")
    .eq("license_id", license.id)
    .eq("device_fingerprint_hash", input.deviceFingerprint.trim())
    .is("revoked_at", null)
    .maybeSingle();

  if (!device) {
    await logEvent(client, {
      licenseId: license.id,
      userId: license.user_id,
      productId: license.product_id,
      eventType: "validate",
      deviceFingerprintHash: input.deviceFingerprint,
      success: false,
      errorCode: "device_limit",
      meta,
    });
    return {
      status: 403,
      body: {
        error: "Device not registered for this license.",
        errorCode: "device_limit",
      },
    };
  }

  await client
    .from("license_devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", device.id);

  const tokenBody = await buildSuccessToken(
    client,
    license as LicenseRow,
    productCode,
    input.deviceFingerprint.trim(),
    "active",
  );
  if ("kind" in tokenBody && tokenBody.kind === "error") {
    return { status: tokenBody.httpStatus, body: { error: tokenBody.error } };
  }

  await logEvent(client, {
    licenseId: license.id,
    userId: license.user_id,
    productId: license.product_id,
    eventType: "validate",
    deviceFingerprintHash: input.deviceFingerprint,
    success: true,
    meta,
    metadata: { appVersion: input.appVersion },
  });

  return { status: 200, body: tokenBody as LicenseValidateResponse };
}

export async function deactivateLicenseDevice(
  client: SupabaseClient,
  input: { licenseToken: string; deviceFingerprint: string },
  meta: RequestMeta,
): Promise<{ ok: boolean; status: number }> {
  const verified = verifyLicenseToken(input.licenseToken);
  if (!verified.ok) return { ok: false, status: verified.errorCode === "expired" ? 403 : 401 };

  const payload = verified.payload;
  if (!payload.sub) return { ok: false, status: 400 };
  if (!deviceFingerprintsMatch(payload.device ?? "", input.deviceFingerprint)) {
    return { ok: false, status: 403 };
  }

  const { data: license } = await client.from("licenses").select("*").eq("id", payload.sub).maybeSingle();
  if (!license) return { ok: false, status: 404 };

  const { data: device } = await client
    .from("license_devices")
    .select("id")
    .eq("license_id", license.id)
    .eq("device_fingerprint_hash", input.deviceFingerprint.trim())
    .is("revoked_at", null)
    .maybeSingle();

  if (!device) return { ok: true, status: 200 };

  await client.from("license_devices").update({ revoked_at: new Date().toISOString() }).eq("id", device.id);

  await logEvent(client, {
    licenseId: license.id,
    userId: license.user_id,
    productId: license.product_id,
    eventType: "deactivate_device",
    deviceFingerprintHash: input.deviceFingerprint,
    success: true,
    meta,
  });

  return { ok: true, status: 200 };
}

export async function loadLicenseByToken(
  client: SupabaseClient,
  token: string,
  expectedProductCode?: string,
) {
  const verified = verifyLicenseToken(token);
  if (!verified.ok) return null;
  const payload = verified.payload;
  if (!payload.sub || !payload.product) return null;
  if (expectedProductCode && payload.product !== expectedProductCode) return null;

  const { data: license } = await client.from("licenses").select("*").eq("id", payload.sub).maybeSingle();
  if (!license) return null;

  const { data: product } = await client
    .from("license_products")
    .select("code")
    .eq("id", license.product_id)
    .maybeSingle();
  if (!product?.code || product.code !== payload.product) return null;
  if (expectedProductCode && product.code !== expectedProductCode) return null;

  const status = effectiveLicenseStatus(license as LicenseRow);
  if (status !== "active") return null;

  const { data: device } = await client
    .from("license_devices")
    .select("id")
    .eq("license_id", license.id)
    .eq("device_fingerprint_hash", payload.device!.trim())
    .is("revoked_at", null)
    .maybeSingle();
  if (!device) return null;

  return license;
}