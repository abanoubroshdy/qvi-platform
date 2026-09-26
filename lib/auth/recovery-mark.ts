import type { SupabaseClient } from "@supabase/supabase-js";

const RECOVERY_MARK_KEY = "qvi-password-recovery";
/** Matches the usual one-hour email OTP lifetime. */
const RECOVERY_MARK_MAX_AGE_MS = 60 * 60 * 1000;

const recoveryListeners = new WeakSet<SupabaseClient>();

type RecoveryMark = {
  userId: string;
  at: number;
};

/**
 * Subscribes once per browser client, at creation, so a PKCE recovery event is
 * recorded even if a later listener is attached after the event.
 */
export function installPasswordRecoveryListener(client: SupabaseClient): void {
  if (recoveryListeners.has(client)) return;
  recoveryListeners.add(client);
  client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session?.user?.id) {
      markPasswordRecovery(session.user.id);
    }
  });
}

export function markPasswordRecovery(userId: string): void {
  if (!userId || typeof sessionStorage === "undefined") return;
  const mark: RecoveryMark = { userId, at: Date.now() };
  try {
    sessionStorage.setItem(RECOVERY_MARK_KEY, JSON.stringify(mark));
  } catch {
    /* private mode */
  }
}

export function hasPasswordRecovery(userId: string | null | undefined): boolean {
  if (!userId || typeof sessionStorage === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(RECOVERY_MARK_KEY);
    if (!raw) return false;
    const mark = JSON.parse(raw) as Partial<RecoveryMark>;
    if (mark.userId !== userId || typeof mark.at !== "number") return false;
    if (Date.now() - mark.at > RECOVERY_MARK_MAX_AGE_MS) return false;
    return true;
  } catch {
    return false;
  }
}

export function clearPasswordRecovery(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(RECOVERY_MARK_KEY);
  } catch {
    /* private mode */
  }
}
