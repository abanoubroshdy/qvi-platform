import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/lib/i18n";
import { formatLicenseKey } from "@/lib/licensing/license-key";
import {
  countRecentLicenseEvents,
  isEmailRateLimited,
  isRevealRateLimited,
  logLicenseKeyEvent,
  revealStoredLicenseKey,
} from "@/lib/licensing/license-key-access";
import { sendLicenseKeyEmail } from "@/lib/licensing/license-key-email";

export async function getLicenseKeyForOwner(
  client: SupabaseClient,
  licenseId: string,
  userId: string,
): Promise<
  | { ok: true; licenseKeyFormatted: string }
  | { ok: false; error: string; code?: string; status: number }
> {
  const reveal = await revealStoredLicenseKey(client, licenseId);
  if (!reveal.ok) {
    if (reveal.reason === "legacy") {
      return { ok: false, error: "Generate a new key to view it.", code: "legacy", status: 404 };
    }
    if (reveal.reason === "not_configured") {
      return { ok: false, error: "Key reveal is not configured.", code: "not_configured", status: 503 };
    }
    const status = reveal.reason === "not_found" ? 404 : 400;
    return { ok: false, error: "License not available.", code: reveal.reason, status };
  }

  const { data: row } = await client
    .from("licenses")
    .select("user_id, product_id, status")
    .eq("id", licenseId)
    .maybeSingle();
  if (!row || row.user_id !== userId || row.status !== "active") {
    return { ok: false, error: "Forbidden", code: "forbidden", status: 403 };
  }

  const recent = await countRecentLicenseEvents(client, licenseId, "license_key_revealed");
  if (isRevealRateLimited(recent)) {
    return { ok: false, error: "Too many requests. Try again later.", code: "rate_limited", status: 429 };
  }

  await logLicenseKeyEvent(client, {
    licenseId,
    userId,
    productId: row.product_id,
    eventType: "license_key_revealed",
    metadata: { source: "owner" },
  });

  return { ok: true, licenseKeyFormatted: reveal.licenseKeyFormatted };
}

export async function maybeAutoEmailLicenseKey(
  client: SupabaseClient,
  licenseId: string,
  enabled: boolean,
  locale?: Locale,
) {
  if (!enabled) return;
  const result = await emailLicenseKeyToOwner(client, licenseId, { actor: "admin", locale });
  if (!result.ok) {
    console.warn("[license] auto-email skipped:", result.code ?? result.error);
  }
}

export async function emailLicenseKeyToOwner(
  client: SupabaseClient,
  licenseId: string,
  options: { userId?: string; locale?: Locale; actor?: "owner" | "admin" },
): Promise<{ ok: true } | { ok: false; error: string; code?: string; status: number }> {
  const { data: row } = await client
    .from("licenses")
    .select("id, user_id, product_id, status, license_key_encrypted, license_products(name)")
    .eq("id", licenseId)
    .maybeSingle();

  if (!row) return { ok: false, error: "License not found.", status: 404 };
  if (row.status !== "active") return { ok: false, error: "License not active.", status: 400 };
  if (options.userId && row.user_id !== options.userId) {
    return { ok: false, error: "Forbidden", code: "forbidden", status: 403 };
  }

  const reveal = await revealStoredLicenseKey(client, licenseId);
  if (!reveal.ok) {
    if (reveal.reason === "legacy") {
      return { ok: false, error: "Generate a new key to email it.", code: "legacy", status: 404 };
    }
    return { ok: false, error: "Could not load license key.", code: reveal.reason, status: 503 };
  }

  const recent = await countRecentLicenseEvents(client, licenseId, "license_key_emailed");
  if (isEmailRateLimited(recent)) {
    return { ok: false, error: "Too many emails. Try again later.", code: "rate_limited", status: 429 };
  }

  const { data: userData } = await client.auth.admin.getUserById(row.user_id);
  const email = userData.user?.email;
  if (!email) return { ok: false, error: "No email on account.", status: 400 };

  const joined = row.license_products as { name: string } | { name: string }[] | null;
  const productName = (Array.isArray(joined) ? joined[0]?.name : joined?.name) ?? "QVI";

  const sent = await sendLicenseKeyEmail({
    to: email,
    productName,
    licenseKeyFormatted: formatLicenseKey(reveal.licenseKeyFormatted),
    locale: options.locale,
  });
  if (!sent.ok) {
    return {
      ok: false,
      error: sent.reason === "not_configured" ? "Email is not configured." : "Email failed.",
      code: sent.reason,
      status: sent.reason === "not_configured" ? 503 : 502,
    };
  }

  await logLicenseKeyEvent(client, {
    licenseId,
    userId: row.user_id,
    productId: row.product_id,
    eventType: "license_key_emailed",
    metadata: { source: options.actor ?? "owner" },
  });

  return { ok: true };
}