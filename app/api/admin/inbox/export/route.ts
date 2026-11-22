import { exportInboxRows } from "@/lib/admin/inbox";
import { rowsToCsv } from "@/lib/admin/csv";
import { requireSiteAdmin } from "@/lib/admin/guard";
import { jsonResponse } from "@/lib/licensing/http";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const CONTACT_HEADERS = ["id", "name", "email", "message", "status", "created_at", "handled_at"];
const WAITLIST_HEADERS = ["id", "product", "email", "status", "created_at", "handled_at"];

export async function GET(request: Request) {
  const guard = await requireSiteAdmin(request);
  if (!guard.ok) return guard.response;

  const client = createServiceSupabaseClient();
  if (!client) return jsonResponse({ error: "Not configured" }, 503);

  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type")?.trim();
  if (typeParam !== "contact" && typeParam !== "waitlist") {
    return jsonResponse({ error: "type must be contact or waitlist." }, 400);
  }

  const exported = await exportInboxRows(client, typeParam);
  if (!exported.ok) return jsonResponse({ error: exported.error }, 500);

  const headers = typeParam === "contact" ? CONTACT_HEADERS : WAITLIST_HEADERS;
  const csv = rowsToCsv(headers, exported.rows);
  const filename = `${typeParam}-export.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}