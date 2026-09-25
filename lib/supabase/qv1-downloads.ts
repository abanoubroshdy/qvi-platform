import type { SupabaseClient } from "@supabase/supabase-js";
import { QV1_DOWNLOAD_WINDOW_MS } from "@/lib/qv1-download-window";

export type Qv1DownloadRow = {
  id: string;
  version: string;
  created_at: string;
};

const USER_AGENT_MAX = 500;

export function trimUserAgent(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return trimmed.slice(0, USER_AGENT_MAX);
}

export async function countRecentQv1Downloads(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<number> {
  const since = new Date(now.getTime() - QV1_DOWNLOAD_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("qv1_downloads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function insertQv1Download(
  supabase: SupabaseClient,
  row: { userId: string; version: string; userAgent: string | null },
): Promise<void> {
  const { error } = await supabase.from("qv1_downloads").insert({
    user_id: row.userId,
    version: row.version,
    user_agent: trimUserAgent(row.userAgent),
  });
  if (error) throw new Error(error.message);
}

export async function fetchQv1Downloads(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ rows: Qv1DownloadRow[]; count: number; error: string | null }> {
  const [list, total] = await Promise.all([
    supabase
      .from("qv1_downloads")
      .select("id, version, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("qv1_downloads").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  if (list.error || total.error) {
    return { rows: [], count: 0, error: list.error?.message || total.error?.message || "unavailable" };
  }

  return {
    rows: (list.data ?? []) as Qv1DownloadRow[],
    count: total.count ?? 0,
    error: null,
  };
}
