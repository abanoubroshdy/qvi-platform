import type { SupabaseClient } from "@supabase/supabase-js";
import { isProtectedAdminEmail } from "@/lib/admin/access";

export type DeleteUserRejectReason = "self" | "protected_admin" | "not_found";

export const DELETE_CONFIRM_KEYWORD = "DELETE";
export const BULK_DELETE_MAX = 50;

export function assessUserDeletion(input: {
  actorUserId: string;
  targetUserId: string;
  targetEmail: string | null;
  env?: Record<string, string | undefined>;
}): { ok: true } | { ok: false; reason: DeleteUserRejectReason } {
  const env = input.env ?? (process.env as Record<string, string | undefined>);
  if (input.actorUserId === input.targetUserId) {
    return { ok: false, reason: "self" };
  }
  if (isProtectedAdminEmail(input.targetEmail, env)) {
    return { ok: false, reason: "protected_admin" };
  }
  return { ok: true };
}

export function reasonToErrorMessage(reason: DeleteUserRejectReason): string {
  switch (reason) {
    case "self":
      return "You cannot delete your own account.";
    case "protected_admin":
      return "This admin account cannot be deleted.";
    case "not_found":
      return "User not found.";
    default:
      return "Delete refused.";
  }
}

async function revokeLicensesForUser(client: SupabaseClient, userId: string, actorEmail: string) {
  const { data: licenses, error } = await client
    .from("licenses")
    .select("id, product_id, status")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  const rows = licenses ?? [];
  const toRevoke = rows.filter((row) => row.status !== "revoked");

  for (const license of toRevoke) {
    await client.from("licenses").update({ status: "revoked" }).eq("id", license.id);
    await client.from("license_events").insert({
      license_id: license.id,
      user_id: userId,
      product_id: license.product_id,
      event_type: "admin_user_delete_revoke",
      success: true,
      metadata: { actor: actorEmail },
    });
  }
}

async function writeAuditLog(
  client: SupabaseClient,
  input: {
    actorUserId: string;
    actorEmail: string;
    targetUserId: string;
    targetEmail: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await client.from("admin_audit_log").insert({
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    action: "user_hard_delete",
    target_user_id: input.targetUserId,
    target_email: input.targetEmail,
    metadata: input.metadata ?? {},
  });
  if (error) throw new Error(error.message);
}

export async function hardDeleteUser(
  client: SupabaseClient,
  input: {
    actorUserId: string;
    actorEmail: string;
    targetUserId: string;
    env?: Record<string, string | undefined>;
  },
): Promise<
  | { ok: true }
  | { ok: false; error: string; code?: DeleteUserRejectReason | "delete_failed"; status: number }
> {
  const env = input.env ?? (process.env as Record<string, string | undefined>);
  const { data: authData, error: authError } = await client.auth.admin.getUserById(input.targetUserId);
  if (authError || !authData.user) {
    return { ok: false, error: reasonToErrorMessage("not_found"), code: "not_found", status: 404 };
  }

  const targetEmail = authData.user.email ?? null;
  const gate = assessUserDeletion({
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId,
    targetEmail,
    env,
  });
  if (!gate.ok) {
    return { ok: false, error: reasonToErrorMessage(gate.reason), code: gate.reason, status: 400 };
  }

  await revokeLicensesForUser(client, input.targetUserId, input.actorEmail);
  await writeAuditLog(client, {
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    targetUserId: input.targetUserId,
    targetEmail,
  });

  const { error: deleteError } = await client.auth.admin.deleteUser(input.targetUserId);
  if (deleteError) {
    return { ok: false, error: deleteError.message, code: "delete_failed", status: 400 };
  }

  return { ok: true };
}

export async function hardDeleteUsersBulk(
  client: SupabaseClient,
  input: {
    actorUserId: string;
    actorEmail: string;
    targetUserIds: string[];
    env?: Record<string, string | undefined>;
  },
): Promise<{
  deleted: string[];
  failed: Array<{ id: string; error: string }>;
}> {
  const unique = Array.from(new Set(input.targetUserIds.map((id) => id.trim()).filter(Boolean))).slice(
    0,
    BULK_DELETE_MAX,
  );
  const deleted: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const id of unique) {
    const result = await hardDeleteUser(client, { ...input, targetUserId: id });
    if (result.ok) deleted.push(id);
    else failed.push({ id, error: result.error });
  }

  return { deleted, failed };
}