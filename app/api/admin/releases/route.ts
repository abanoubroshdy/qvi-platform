import { sanitizeReleaseRow, sanitizeReleaseRows } from "@/lib/admin/release-public";
import { jsonResponse } from "@/lib/licensing/http";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { isProductCode } from "@/lib/licensing/products";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const url = new URL(request.url);
  const product = url.searchParams.get("product")?.trim();

  let query = client.from("license_releases").select("*").order("created_at", { ascending: false }).limit(100);
  if (product) query = query.eq("product_code", product);

  const { data, error } = await query;
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ releases: sanitizeReleaseRows(data ?? []) });
}

export async function POST(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  let body: {
    productCode?: string;
    version?: string;
    channel?: string;
    storagePath?: string;
    sha256?: string;
    releaseNotes?: string;
    minLicense?: string | null;
    isPublished?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid body" }, 400);
  }

  const productCode = body.productCode?.trim() ?? "";
  if (!isProductCode(productCode)) return jsonResponse({ error: "Invalid product." }, 400);

  const channel = body.channel?.trim() ?? "stable";
  if (!["evaluation", "stable", "beta"].includes(channel)) {
    return jsonResponse({ error: "Invalid channel." }, 400);
  }

  const { data, error } = await client
    .from("license_releases")
    .insert({
      product_code: productCode,
      version: body.version?.trim(),
      channel,
      storage_path: body.storagePath?.trim(),
      sha256: body.sha256?.trim(),
      release_notes: body.releaseNotes ?? null,
      min_license: body.minLicense ?? null,
      is_published: body.isPublished ?? true,
    })
    .select("*")
    .single();

  if (error) return jsonResponse({ error: error.message }, 400);
  return jsonResponse({ release: sanitizeReleaseRow(data) });
}