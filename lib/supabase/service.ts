import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolvePublicSupabaseConfig } from "@/lib/supabase/config";

export function resolveServiceSupabaseKey(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string | null {
  const key =
    env.SUPABASE_SECRET_KEY?.trim() ||
    env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    env.SUPABASE_SERVICE_KEY?.trim();
  return key || null;
}

export function createServiceSupabaseClient(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): SupabaseClient | null {
  const publicConfig = resolvePublicSupabaseConfig(env);
  const serviceKey = resolveServiceSupabaseKey(env);
  if (!publicConfig || !serviceKey) return null;
  return createClient(publicConfig.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}