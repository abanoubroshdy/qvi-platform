import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePublicSupabaseConfig, type PublicSupabaseConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;
let resolved: PublicSupabaseConfig | null = resolvePublicSupabaseConfig();

function createClient(config: PublicSupabaseConfig): SupabaseClient {
  return createBrowserClient(config.url, config.anonKey);
}

export function configureSupabase(config: PublicSupabaseConfig | null): SupabaseClient | null {
  if (!config) return browserClient;
  if (resolved && browserClient && resolved.url === config.url && resolved.anonKey === config.anonKey) {
    return browserClient;
  }
  resolved = config;
  browserClient = createClient(config);
  return browserClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(resolved || browserClient);
}

/**
 * Returns a singleton Supabase browser client, or null when the public
 * env vars are missing so the app keeps working without a backend.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (browserClient) return browserClient;
  if (!resolved) {
    resolved = resolvePublicSupabaseConfig();
  }
  if (!resolved) return null;
  browserClient = createClient(resolved);
  return browserClient;
}
