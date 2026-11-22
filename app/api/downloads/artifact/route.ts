import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { loadLicenseByToken } from "@/lib/licensing/service";
import { getRequestSupabaseSession } from "@/lib/supabase/request-session";
import { isProductCode, PRODUCT_CODES } from "@/lib/licensing/products";
import { presignR2GetUrl } from "@/lib/r2-presign";
import { clientIp } from "@/lib/licensing/http";

export const dynamic = "force-dynamic";

async function authorizeDownload(
  request: Request,
  productCode: string,
): Promise<{ userId: string | null; licenseId: string | null; productId: string | null } | null> {
  const client = createServiceSupabaseClient();
  if (!client) return null;

  const session = await getRequestSupabaseSession(request);
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (bearer) {
    const license = await loadLicenseByToken(client, bearer, productCode);
    if (!license) return null;
    const { data: licensedProduct } = await client
      .from("license_products")
      .select("id, code")
      .eq("id", license.product_id)
      .maybeSingle();
    if (licensedProduct?.code !== productCode) return null;
    return {
      userId: license.user_id,
      licenseId: license.id,
      productId: license.product_id,
    };
  }

  if (!session) return null;

  const { data: product } = await client
    .from("license_products")
    .select("id, is_free")
    .eq("code", productCode)
    .maybeSingle();
  if (!product) return null;

  if (product.is_free && productCode === PRODUCT_CODES.qv1Eval) {
    return { userId: session.userId, licenseId: null, productId: product.id };
  }

  const { data: license } = await client
    .from("licenses")
    .select("id, status, expires_at")
    .eq("user_id", session.userId)
    .eq("product_id", product.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!license) return null;
  if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) return null;

  return { userId: session.userId, licenseId: license.id, productId: product.id };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const product = url.searchParams.get("product")?.trim() ?? "";
  const channel = url.searchParams.get("channel")?.trim() ?? "stable";
  const version = url.searchParams.get("version")?.trim();

  if (!isProductCode(product)) {
    return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  }

  const client = createServiceSupabaseClient();
  if (!client) {
    return NextResponse.json({ error: "Downloads are not configured." }, { status: 503 });
  }

  const authz = await authorizeDownload(request, product);
  if (!authz) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let query = client
    .from("license_releases")
    .select("*")
    .eq("product_code", product)
    .eq("channel", channel)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (version) query = query.eq("version", version);

  const { data: releases } = await query;
  const release = releases?.[0];
  if (!release) {
    return NextResponse.json({ error: "Release not found." }, { status: 404 });
  }

  const signed = await presignR2GetUrl(release.storage_path);
  if (!signed) {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
  }

  await client.from("license_events").insert({
    license_id: authz.licenseId,
    user_id: authz.userId,
    product_id: authz.productId,
    event_type: "download",
    success: true,
    ip_address: clientIp(request),
    user_agent: request.headers.get("user-agent"),
    metadata: {
      product,
      channel,
      version: release.version,
    },
  });

  return NextResponse.redirect(signed, 307);
}