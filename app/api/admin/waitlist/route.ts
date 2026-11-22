import { listWaitlistSignups, updateWaitlistSignup } from "@/lib/admin/inbox";
import { parsePaginationFromUrl } from "@/lib/admin/pagination";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { jsonResponse } from "@/lib/licensing/http";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status")?.trim();
  const status = statusParam === "handled" || statusParam === "new" ? statusParam : "all";
  const product = url.searchParams.get("product")?.trim();
  const { limit, offset } = parsePaginationFromUrl(url);

  const listed = await listWaitlistSignups(client, { status, product, limit, offset });
  if (!listed.ok) return jsonResponse({ error: listed.error }, 500);

  return jsonResponse({
    items: listed.items,
    total: listed.total,
    limit,
    offset,
  });
}

export async function PATCH(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  let body: { id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid body" }, 400);
  }

  const id = body.id?.trim();
  const status = body.status?.trim();
  if (!id || (status !== "new" && status !== "handled")) {
    return jsonResponse({ error: "id and status (new|handled) are required." }, 400);
  }

  const updated = await updateWaitlistSignup(client, id, status);
  if (!updated.ok) return jsonResponse({ error: updated.error }, updated.error === "Not found." ? 404 : 400);
  return jsonResponse({ item: updated.item });
}