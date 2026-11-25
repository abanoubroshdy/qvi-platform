const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerifyResult =
  | { ok: true; skipped: boolean }
  | { ok: false; reason: "missing_token" | "invalid" | "network" };

export function resolveTurnstileSiteKey(
  env?: Record<string, string | undefined>,
): string | null {
  const key = (env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)?.trim();
  return key || null;
}

export function resolveTurnstileSecretKey(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string | null {
  const key = env.TURNSTILE_SECRET_KEY?.trim();
  return key || null;
}

/** Turnstile is enforced only when both site (public) and secret keys are set. */
export function isTurnstileEnforced(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  return Boolean(resolveTurnstileSiteKey(env) && resolveTurnstileSecretKey(env));
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  options?: {
    remoteIp?: string | null;
    env?: Record<string, string | undefined>;
  },
): Promise<TurnstileVerifyResult> {
  const env = options?.env ?? (process.env as Record<string, string | undefined>);
  const secret = resolveTurnstileSecretKey(env);
  if (!secret) return { ok: true, skipped: true };

  const value = token?.trim();
  if (!value) return { ok: false, reason: "missing_token" };

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", value);
    const remoteIp = options?.remoteIp?.trim();
    if (remoteIp) body.set("remoteip", remoteIp);

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) return { ok: false, reason: "network" };

    const json = (await response.json()) as { success?: boolean };
    if (!json.success) return { ok: false, reason: "invalid" };
    return { ok: true, skipped: false };
  } catch {
    return { ok: false, reason: "network" };
  }
}