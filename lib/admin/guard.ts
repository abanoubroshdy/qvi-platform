import { isSiteAdminEmail } from "@/lib/admin/access";
import { getRequestSupabaseSession } from "@/lib/supabase/request-session";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function requireSiteAdmin(
  request: Request,
): Promise<
  | { ok: true; email: string; userId: string }
  | { ok: false; response: Response }
> {
  const session = await getRequestSupabaseSession(request);
  if (!session) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    };
  }

  const { data } = await session.client.auth.getUser();
  const email = data.user?.email;
  if (!isSiteAdminEmail(email)) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    };
  }

  const service = createServiceSupabaseClient();
  if (!service) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    };
  }

  return { ok: true, email: email!, userId: session.userId };
}