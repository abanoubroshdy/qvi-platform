import { getRequestSupabaseSession } from "@/lib/supabase/request-session";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { isLicenseAdminEmail } from "@/lib/licensing/admin";

export async function requireLicenseAdmin(
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
  if (!isLicenseAdminEmail(email)) {
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