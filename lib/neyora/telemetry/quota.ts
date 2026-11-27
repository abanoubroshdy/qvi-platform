import type { SupabaseClient } from "@supabase/supabase-js";
import { TELEMETRY_DAILY_UPLOAD_QUOTA } from "@/lib/neyora/telemetry/constants";

export function startOfUtcDayIso(): string {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  return start.toISOString();
}

export async function countDailyTelemetryUploads(client: SupabaseClient, userId: string): Promise<number> {
  const since = startOfUtcDayIso();
  const { count, error } = await client
    .from("neyora_training_submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) return TELEMETRY_DAILY_UPLOAD_QUOTA;
  return count ?? 0;
}

export function isWithinDailyQuota(count: number): boolean {
  return count < TELEMETRY_DAILY_UPLOAD_QUOTA;
}