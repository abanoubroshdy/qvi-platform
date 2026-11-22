import { jsonResponse } from "@/lib/licensing/http";
import { getRequestSupabaseSession } from "@/lib/supabase/request-session";
import { revokeOwnDevice } from "@/lib/supabase/licensing";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getRequestSupabaseSession(request);
  if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

  let body: { deviceId?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid body" }, 400);
  }

  const deviceId = body.deviceId?.trim();
  if (!deviceId) return jsonResponse({ error: "deviceId is required." }, 400);

  const result = await revokeOwnDevice(session.client, deviceId);
  if (!result.ok) return jsonResponse({ error: result.error ?? "Could not revoke device." }, 400);
  return jsonResponse({ ok: true });
}