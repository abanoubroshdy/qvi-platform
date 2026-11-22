import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolvePublicSupabaseConfig } from "@/lib/supabase/config";

/** Ephemeral Supabase client for auth API routes (anon key, no cookie session). */
export function createServerAuthClient(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): SupabaseClient | null {
  const config = resolvePublicSupabaseConfig(env);
  if (!config) return null;
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}