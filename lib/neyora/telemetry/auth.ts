import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCT_CODES } from "@/lib/licensing/products";
import { resolveVerifiedLicenseBearer } from "@/lib/licensing/token-access";
import { verifyLicenseToken } from "@/lib/licensing/jwt";

export type NeyoraTelemetryPrincipal = {
  userId: string;
  email: string;
  licenseId: string;
  deviceFingerprint: string;
};

export function readLicenseBearer(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

export async function resolveNeyoraTelemetryPrincipal(
  client: SupabaseClient,
  request: Request,
): Promise<NeyoraTelemetryPrincipal | null> {
  const bearer = readLicenseBearer(request);
  if (!bearer) return null;

  const verified = verifyLicenseToken(bearer);
  if (!verified.ok) return null;

  const context = await resolveVerifiedLicenseBearer(client, bearer, PRODUCT_CODES.neyoraPro);
  if (!context) return null;

  const { data: userData, error } = await client.auth.admin.getUserById(context.license.user_id);
  if (error || !userData?.user?.email) return null;

  return {
    userId: context.license.user_id,
    email: userData.user.email.trim(),
    licenseId: context.license.id,
    deviceFingerprint: context.deviceFingerprint,
  };
}