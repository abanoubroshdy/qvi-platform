import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePublicSupabaseConfig } from "@/lib/supabase/config";

export type RequestSupabaseSession = {
  client: SupabaseClient;
  userId: string;
};

export function parseCookieHeader(header: string | null): { name: string; value: string }[] {
  if (!header) return [];
  return header.split(";").flatMap((part) => {
    const index = part.indexOf("=");
    if (index <= 0) return [];
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!name) return [];
    return [{ name, value }];
  });
}

/**
 * Reads the Supabase auth cookies on this request. Returns null when the
 * public config is missing or the visitor has no session.
 */
export async function getRequestSupabaseSession(request: Request): Promise<RequestSupabaseSession | null> {
  const config = resolvePublicSupabaseConfig();
  if (!config) return null;

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("cookie"));
      },
      setAll() {
        // Session refresh cookies are not required to authorize a single download.
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { client: supabase, userId: data.user.id };
}
