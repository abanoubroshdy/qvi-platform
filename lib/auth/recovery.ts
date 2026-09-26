import type { EmailOtpType } from "@supabase/supabase-js";
import type { Locale } from "@/lib/i18n";
import { splitHref, stripLocale, withLocale } from "@/lib/i18n/locale-path";
import { postAuthPath } from "@/lib/qv1-download";
import { clearPasswordRecovery, hasPasswordRecovery, markPasswordRecovery } from "@/lib/auth/recovery-mark";

export { clearPasswordRecovery, hasPasswordRecovery, markPasswordRecovery };

export const FORGOT_PASSWORD_PATH = "/forgot-password";
export const RESET_PASSWORD_PATH = "/reset-password";
export const AUTH_CALLBACK_PATH = "/auth/callback";

export const PASSWORD_UPDATED_NOTICE = "password-updated";
export const PASSWORD_SESSIONS_NOTICE = "password-sessions";

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

const SECRET_CALLBACK_PARAMS = [
  "token_hash",
  "token",
  "code",
  "access_token",
  "refresh_token",
  "expires_in",
  "expires_at",
  "token_type",
  "provider_token",
  "provider_refresh_token",
] as const;

export type AuthErrorLike = {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
};

export type PasswordResetOutcome = "sent" | "rate_limited" | "error";

export type AuthCallbackRequest = {
  tokenHash: string | null;
  otpType: EmailOtpType | null;
  hasUrlError: boolean;
  next: string;
  recoveryIntent: boolean;
};

export type AuthCallbackPreview =
  | {
      kind: "verify-otp";
      tokenHash: string;
      otpType: EmailOtpType;
      recovery: boolean;
      fallbackNext: string;
    }
  | { kind: "recovery-error" };

export type AuthCallbackDecision =
  | { kind: "reset" }
  | { kind: "reset-invalid" }
  | { kind: "continue"; path: string }
  | { kind: "sign-in"; path: string };

export function isEmailOtpType(value: string | null | undefined): value is EmailOtpType {
  return Boolean(value && EMAIL_OTP_TYPES.has(value as EmailOtpType));
}

export function isResetPasswordPath(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return false;
  const { pathname } = splitHref(trimmed);
  return stripLocale(pathname) === RESET_PASSWORD_PATH;
}

/**
 * Builds an absolute URL only when `origin` is a scheme + host and `path` is
 * a same-site path. Callers pass `window.location.origin`, never a user value.
 */
export function sameOriginUrl(origin: string, path: string): string | null {
  let base: URL;
  try {
    base = new URL(origin);
  } catch {
    return null;
  }
  if (base.protocol !== "https:" && base.protocol !== "http:") return null;
  if (base.username || base.password) return null;
  if (base.pathname !== "/" && base.pathname !== "") return null;
  if (base.search || base.hash) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.includes("\\") || path.includes("://") || path.includes("\n") || path.includes("\r")) return null;
  return `${base.origin}${path}`;
}

export function passwordRecoveryRedirectPath(locale: Locale): string {
  const callback = withLocale(AUTH_CALLBACK_PATH, locale);
  const next = withLocale(RESET_PASSWORD_PATH, locale);
  return `${callback}?next=${encodeURIComponent(next)}`;
}

export function passwordResetRedirectUrl(origin: string, locale: Locale): string | null {
  return sameOriginUrl(origin, passwordRecoveryRedirectPath(locale));
}

export function accountNoticePath(
  locale: Locale,
  notice: typeof PASSWORD_UPDATED_NOTICE | typeof PASSWORD_SESSIONS_NOTICE,
): string {
  return withLocale(`/account?notice=${encodeURIComponent(notice)}`, locale);
}

export function isRateLimitError(error: AuthErrorLike | null | undefined): boolean {
  if (!error) return false;
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.status === 429 ||
    code.includes("rate_limit") ||
    message.includes("rate limit") ||
    message.includes("too many") ||
    message.includes("only request this") ||
    message.includes("once every")
  );
}

export function isHiddenAccountError(error: AuthErrorLike | null | undefined): boolean {
  if (!error) return false;
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";
  return (
    code === "user_not_found" ||
    code === "email_not_found" ||
    message.includes("user not found") ||
    message.includes("email not found") ||
    message.includes("email address not found")
  );
}

export function isInvalidCredentialsError(error: AuthErrorLike | null | undefined): boolean {
  if (!error) return false;
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";
  return code === "invalid_credentials" || message.includes("invalid login");
}

export function isSessionMissingError(error: AuthErrorLike | null | undefined): boolean {
  if (!error) return false;
  const name = error.name?.toLowerCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";
  return name === "authsessionmissingerror" || message.includes("session missing");
}

/** Success and unknown-account responses share one outcome so the UI cannot enumerate emails. */
export function passwordResetOutcome(error: AuthErrorLike | null | undefined): PasswordResetOutcome {
  if (!error || isHiddenAccountError(error)) return "sent";
  if (isRateLimitError(error)) return "rate_limited";
  return "error";
}

function mergedParams(href: string): URLSearchParams {
  const url = new URL(href, "https://getqvi.com");
  const params = new URLSearchParams(url.search);
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  new URLSearchParams(hash).forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  return params;
}

export function readAuthCallback(href: string, autostartToken?: string): AuthCallbackRequest {
  const params = mergedParams(href);
  const tokenHash = params.get("token_hash")?.trim() || null;
  const type = params.get("type");
  const nextParam = params.get("next");
  return {
    tokenHash,
    otpType: isEmailOtpType(type) ? type : null,
    hasUrlError: Boolean(params.get("error") || params.get("error_code") || params.get("error_description")),
    next: postAuthPath(nextParam, autostartToken),
    recoveryIntent: isResetPasswordPath(nextParam) || type === "recovery",
  };
}

/** URL-only decisions. Session checks happen after the PKCE client finishes initializing. */
export function previewAuthCallback(request: AuthCallbackRequest): AuthCallbackPreview | null {
  if (request.tokenHash && request.otpType) {
    return {
      kind: "verify-otp",
      tokenHash: request.tokenHash,
      otpType: request.otpType,
      recovery: request.otpType === "recovery",
      fallbackNext: request.next,
    };
  }
  if (request.hasUrlError && request.recoveryIntent) return { kind: "recovery-error" };
  return null;
}

export function decideAuthCallback(
  request: AuthCallbackRequest,
  session: { hasUser: boolean; recoveryMarked: boolean },
): AuthCallbackDecision {
  if (request.recoveryIntent) {
    if (session.hasUser && session.recoveryMarked) return { kind: "reset" };
    return { kind: "reset-invalid" };
  }
  if (session.hasUser) return { kind: "continue", path: request.next };
  const { pathname } = splitHref(request.next);
  if (stripLocale(pathname) === "/account") return { kind: "sign-in", path: "/login" };
  return { kind: "sign-in", path: `/login?next=${encodeURIComponent(request.next)}` };
}

/** Path and query only. Drops tokens so a refresh cannot reuse a one-time link. */
export function callbackPathWithoutSecrets(href: string): string {
  const url = new URL(href, "https://getqvi.com");
  for (const key of SECRET_CALLBACK_PARAMS) url.searchParams.delete(key);
  const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  for (const key of SECRET_CALLBACK_PARAMS) hash.delete(key);
  const hashString = hash.toString();
  const pathname = url.pathname.startsWith("/") && !url.pathname.startsWith("//") ? url.pathname : "/auth/callback";
  return `${pathname}${url.search}${hashString ? `#${hashString}` : ""}`;
}

export function readPasswordNotice(value: string | null | undefined):
  | typeof PASSWORD_UPDATED_NOTICE
  | typeof PASSWORD_SESSIONS_NOTICE
  | null {
  if (value === PASSWORD_UPDATED_NOTICE || value === PASSWORD_SESSIONS_NOTICE) return value;
  return null;
}
