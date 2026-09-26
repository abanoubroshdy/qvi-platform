import { readFileSync } from "node:fs";
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  PASSWORD_SESSIONS_NOTICE,
  PASSWORD_UPDATED_NOTICE,
  accountNoticePath,
  callbackPathWithoutSecrets,
  clearPasswordRecovery,
  decideAuthCallback,
  hasPasswordRecovery,
  isHiddenAccountError,
  markPasswordRecovery,
  passwordRecoveryRedirectPath,
  passwordResetOutcome,
  passwordResetRedirectUrl,
  previewAuthCallback,
  readAuthCallback,
  readPasswordNotice,
  sameOriginUrl,
} from "@/lib/auth/recovery";

function memoryStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
}

describe("password reset redirects", () => {
  it("keeps the email redirect on the same origin and locale", () => {
    expect(passwordRecoveryRedirectPath("en")).toBe("/auth/callback?next=%2Freset-password");
    expect(passwordRecoveryRedirectPath("ar")).toBe("/ar/auth/callback?next=%2Far%2Freset-password");
    expect(passwordResetRedirectUrl("https://getqvi.com", "en")).toBe(
      "https://getqvi.com/auth/callback?next=%2Freset-password",
    );
    expect(passwordResetRedirectUrl("https://www.getqvi.com", "ar")).toBe(
      "https://www.getqvi.com/ar/auth/callback?next=%2Far%2Freset-password",
    );
    expect(passwordResetRedirectUrl("http://localhost:3000", "en")).toBe(
      "http://localhost:3000/auth/callback?next=%2Freset-password",
    );
  });

  it("rejects origins and paths that could leave the site", () => {
    expect(sameOriginUrl("https://getqvi.com/auth/callback", "/reset-password")).toBeNull();
    expect(sameOriginUrl("https://user:pass@getqvi.com", "/reset-password")).toBeNull();
    expect(sameOriginUrl("javascript:alert(1)", "/reset-password")).toBeNull();
    expect(sameOriginUrl("https://getqvi.com", "//evil.com")).toBeNull();
    expect(sameOriginUrl("https://getqvi.com", "https://evil.com/reset-password")).toBeNull();
    expect(sameOriginUrl("https://getqvi.com?next=https://evil.com", "/reset-password")).toBeNull();
    expect(accountNoticePath("ar", PASSWORD_SESSIONS_NOTICE)).toBe("/ar/account?notice=password-sessions");
    expect(accountNoticePath("en", PASSWORD_UPDATED_NOTICE)).toBe("/account?notice=password-updated");
  });
});

describe("password reset responses", () => {
  it("hides whether an email is registered and surfaces rate limits", () => {
    expect(passwordResetOutcome(null)).toBe("sent");
    expect(passwordResetOutcome({ message: "User not found", status: 400, code: "user_not_found" })).toBe("sent");
    expect(isHiddenAccountError({ message: "Email address not found" })).toBe(true);
    expect(passwordResetOutcome({ message: "Email rate limit exceeded", status: 429, code: "over_email_send_rate_limit" })).toBe(
      "rate_limited",
    );
    expect(passwordResetOutcome({ message: "For security purposes, you can only request this after 60 seconds" })).toBe(
      "rate_limited",
    );
    expect(passwordResetOutcome({ message: "Failed to fetch", status: 500 })).toBe("error");
  });
});

describe("auth callback planning", () => {
  it("verifies a recovery token hash and ignores off-site next targets", () => {
    const request = readAuthCallback(
      "https://getqvi.com/auth/callback?next=https://evil.com&token_hash=abc&type=recovery",
    );
    expect(request.next).toBe("/account");
    expect(request.recoveryIntent).toBe(true);
    expect(previewAuthCallback(request)).toMatchObject({
      kind: "verify-otp",
      tokenHash: "abc",
      otpType: "recovery",
      recovery: true,
    });
    expect(readAuthCallback("https://getqvi.com/auth/callback?next=//evil.com").next).toBe("/account");
  });

  it("sends an expired recovery link to the reset page without a session", () => {
    const request = readAuthCallback(
      "https://getqvi.com/ar/auth/callback?next=%2Far%2Freset-password&error=access_denied&error_code=otp_expired",
    );
    expect(previewAuthCallback(request)).toEqual({ kind: "recovery-error" });
    expect(decideAuthCallback(request, { hasUser: false, recoveryMarked: false })).toEqual({ kind: "reset-invalid" });
    expect(decideAuthCallback(request, { hasUser: true, recoveryMarked: false })).toEqual({ kind: "reset-invalid" });
    expect(decideAuthCallback(request, { hasUser: true, recoveryMarked: true })).toEqual({ kind: "reset" });
  });

  it("reads hash errors and keeps an ordinary sign-in callback on its next path", () => {
    const expired = readAuthCallback(
      "https://getqvi.com/auth/callback?next=%2Freset-password#error_code=otp_expired&error_description=expired",
    );
    expect(previewAuthCallback(expired)?.kind).toBe("recovery-error");

    const signup = readAuthCallback("https://getqvi.com/auth/callback?next=%2Faccount&code=pkce-code");
    expect(previewAuthCallback(signup)).toBeNull();
    expect(decideAuthCallback(signup, { hasUser: true, recoveryMarked: false })).toEqual({
      kind: "continue",
      path: "/account",
    });
    expect(decideAuthCallback(signup, { hasUser: false, recoveryMarked: false })).toEqual({ kind: "sign-in", path: "/login" });
  });

  it("strips one-time tokens from the callback path", () => {
    expect(
      callbackPathWithoutSecrets(
        "https://getqvi.com/auth/callback?next=%2Freset-password&code=secret&token_hash=hash#access_token=tok&type=recovery",
      ),
    ).toBe("/auth/callback?next=%2Freset-password#type=recovery");
    expect(callbackPathWithoutSecrets("https://evil.com/auth/callback?code=secret")).not.toContain("evil.com");
  });
});

describe("recovery session mark", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("accepts only a fresh mark for the same user", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T12:00:00Z"));
    memoryStorage();
    expect(hasPasswordRecovery("user-a")).toBe(false);
    markPasswordRecovery("user-a");
    expect(hasPasswordRecovery("user-a")).toBe(true);
    expect(hasPasswordRecovery("user-b")).toBe(false);
    vi.setSystemTime(new Date("2026-09-26T13:00:01Z"));
    expect(hasPasswordRecovery("user-a")).toBe(false);
    markPasswordRecovery("user-a");
    clearPasswordRecovery();
    expect(hasPasswordRecovery("user-a")).toBe(false);
    expect(readPasswordNotice("password-updated")).toBe("password-updated");
    expect(readPasswordNotice("nope")).toBeNull();
  });
});

describe("password pages stay free of ads", () => {
  it("does not mount AdSense on the recovery screens", () => {
    const files = [
      "components/auth/ForgotPasswordForm.tsx",
      "components/auth/ResetPasswordForm.tsx",
      "components/auth/ChangePasswordForm.tsx",
      "components/auth/AuthCallback.tsx",
      "components/auth/AuthForm.tsx",
      "app/forgot-password/page.tsx",
      "app/reset-password/page.tsx",
      "app/auth/callback/page.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
      expect(source, file).not.toMatch(/ToolAd|AdSenseScript|adsbygoogle|ca-pub-/);
    }
  });
});
