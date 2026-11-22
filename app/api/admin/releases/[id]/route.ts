import { requireSiteAdmin } from "@/lib/admin/guard";
import { jsonResponse } from "@/lib/licensing/http";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  let body: {
    version?: string;
    channel?: string;
    storagePath?: string;
    sha256?: string;
    releaseNotes?: string | null;
    minLicense?: string | null;
    isPublished?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid body" }, 400);
  }

  const channel = body.channel?.trim();
  if (channel && !["evaluation", "stable", "beta"].includes(channel)) {
    return jsonResponse({ error: "Invalid channel." }, 400);
  }

  const patch: Record<string, unknown> = {};
  if (body.version !== undefined) patch.version = body.version.trim();
  if (channel) patch.channel = channel;
  if (body.storagePath !== undefined) patch.storage_path = body.storagePath.trim();
  if (body.sha256 !== undefined) patch.sha256 = body.sha256.trim();
  if (body.releaseNotes !== undefined) patch.release_notes = body.releaseNotes;
  if (body.minLicense !== undefined) patch.min_license = body.minLicense;
  if (body.isPublished !== undefined) patch.is_published = body.isPublished;

  if (Object.keys(patch).length === 0) {
    return jsonResponse({ error: "No fields to update." }, 400);
  }

  const { id } = await context.params;
  const { data, error } = await client
    .from("license_releases")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return jsonResponse({ error: error.message }, 400);
  if (!data) return jsonResponse({ error: "Release not found." }, 404);
  return jsonResponse({ release: data });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const { id } = await context.params;
  const { data, error } = await client.from("license_releases").delete().eq("id", id).select("id").maybeSingle();
  if (error) return jsonResponse({ error: error.message }, 400);
  if (!data) return jsonResponse({ error: "Release not found." }, 404);
  return jsonResponse({ ok: true });
}