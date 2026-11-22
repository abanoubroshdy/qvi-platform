import type { SupabaseClient } from "@supabase/supabase-js";

export type InboxStatus = "new" | "handled";

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: InboxStatus;
  created_at: string;
  handled_at: string | null;
  handled_by: string | null;
};

export type WaitlistSignup = {
  id: string;
  product: string;
  email: string;
  user_id: string | null;
  status: InboxStatus;
  created_at: string;
  handled_at: string | null;
};

export async function listContactSubmissions(
  client: SupabaseClient,
  options: { status?: InboxStatus | "all"; limit: number; offset: number },
) {
  let query = client
    .from("contact_submissions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(options.offset, options.offset + options.limit - 1);

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error, count } = await query;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, items: (data ?? []) as ContactSubmission[], total: count ?? 0 };
}

export async function updateContactSubmission(
  client: SupabaseClient,
  id: string,
  input: { status: InboxStatus; handledBy: string | null },
) {
  const patch: Record<string, unknown> = { status: input.status };
  if (input.status === "handled") {
    patch.handled_at = new Date().toISOString();
    patch.handled_by = input.handledBy;
  } else {
    patch.handled_at = null;
    patch.handled_by = null;
  }

  const { data, error } = await client
    .from("contact_submissions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Not found." };
  return { ok: true as const, item: data as ContactSubmission };
}

export async function listWaitlistSignups(
  client: SupabaseClient,
  options: { status?: InboxStatus | "all"; product?: string; limit: number; offset: number },
) {
  let query = client
    .from("waitlist_signups")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(options.offset, options.offset + options.limit - 1);

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }
  if (options.product?.trim()) {
    query = query.eq("product", options.product.trim());
  }

  const { data, error, count } = await query;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, items: (data ?? []) as WaitlistSignup[], total: count ?? 0 };
}

export async function updateWaitlistSignup(client: SupabaseClient, id: string, status: InboxStatus) {
  const patch: Record<string, unknown> = { status };
  patch.handled_at = status === "handled" ? new Date().toISOString() : null;

  const { data, error } = await client
    .from("waitlist_signups")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Not found." };
  return { ok: true as const, item: data as WaitlistSignup };
}

export async function exportInboxRows(
  client: SupabaseClient,
  type: "contact" | "waitlist",
): Promise<{ ok: true; rows: Record<string, unknown>[] } | { ok: false; error: string }> {
  if (type === "contact") {
    const { data, error } = await client
      .from("contact_submissions")
      .select("id, name, email, message, status, created_at, handled_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) return { ok: false, error: error.message };
    return { ok: true, rows: (data ?? []) as Record<string, unknown>[] };
  }

  const { data, error } = await client
    .from("waitlist_signups")
    .select("id, product, email, status, created_at, handled_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: (data ?? []) as Record<string, unknown>[] };
}