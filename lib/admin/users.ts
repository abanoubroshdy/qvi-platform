import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminUserSearchFilters = {
  unconfirmedOnly?: boolean;
  neverSignedIn?: boolean;
  createdSince?: string | null;
  createdUntil?: string | null;
};

export type AdminUserSummary = {
  id: string;
  email: string | null;
  full_name?: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  is_banned: boolean;
  email_confirmed?: boolean;
};

export type AdminUserSearchResult = {
  users: AdminUserSummary[];
  total: number;
};

export async function searchUsers(
  client: SupabaseClient,
  query: string,
  limit: number,
  offset: number,
  filters: AdminUserSearchFilters = {},
): Promise<{ ok: true; result: AdminUserSearchResult } | { ok: false; error: string }> {
  const { data, error } = await client.rpc("admin_search_users", {
    p_query: query,
    p_limit: limit,
    p_offset: offset,
    p_unconfirmed_only: filters.unconfirmedOnly ?? false,
    p_never_signed_in: filters.neverSignedIn ?? false,
    p_created_since: filters.createdSince ?? null,
    p_created_until: filters.createdUntil ?? null,
  });
  if (error) return { ok: false, error: error.message };
  const record = (data ?? {}) as AdminUserSearchResult;
  return {
    ok: true,
    result: {
      users: record.users ?? [],
      total: record.total ?? 0,
    },
  };
}

export async function fetchAdminUserDetail(client: SupabaseClient, userId: string) {
  const { data: authData, error: authError } = await client.auth.admin.getUserById(userId);
  if (authError || !authData.user) {
    return { ok: false as const, error: "User not found." };
  }

  const user = authData.user;
  const { data: profile } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();

  const { data: licenses } = await client
    .from("licenses")
    .select("id, status, license_key_hint, created_at, license_products(code, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const { count: downloadCount } = await client
    .from("qv1_downloads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const isBanned = Boolean(user.banned_until && new Date(user.banned_until) > new Date());
  const emailConfirmed = Boolean(
    (user as { email_confirmed_at?: string | null }).email_confirmed_at,
  );

  return {
    ok: true as const,
    user: {
      id: user.id,
      email: user.email ?? null,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
      banned_until: user.banned_until ?? null,
      is_banned: isBanned,
      email_confirmed: emailConfirmed,
      profile,
      licenses: licenses ?? [],
      qv1_download_count: downloadCount ?? 0,
    },
  };
}

export async function banUser(
  client: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await client.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unbanUser(
  client: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await client.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}