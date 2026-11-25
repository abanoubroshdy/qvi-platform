import { parsePaginationFromUrl } from "@/lib/admin/pagination";
import { searchUsers } from "@/lib/admin/users";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { NextResponse } from "next/server";
import { jsonResponse } from "@/lib/licensing/http";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const { limit, offset } = parsePaginationFromUrl(url);
  const unconfirmedOnly = url.searchParams.get("unconfirmed") === "1";
  const neverSignedIn = url.searchParams.get("never_signed_in") === "1";
  const createdSince = url.searchParams.get("created_since")?.trim() || null;
  const createdUntil = url.searchParams.get("created_until")?.trim() || null;

  const result = await searchUsers(client, query, limit, offset, {
    unconfirmedOnly,
    neverSignedIn,
    createdSince,
    createdUntil,
  });
  if (!result.ok) return jsonResponse({ error: result.error }, 500);

  return NextResponse.json(
    {
      users: result.result.users,
      total: result.result.total,
      limit,
      offset,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}