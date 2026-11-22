import { afterEach, describe, expect, it, vi } from "vitest";
import { isTurnstileEnforced, verifyTurnstileToken } from "@/lib/turnstile";

describe("turnstile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("skips verification when the secret key is unset", async () => {
    const result = await verifyTurnstileToken("any", { env: {} });
    expect(result).toEqual({ ok: true, skipped: true });
    expect(isTurnstileEnforced({})).toBe(false);
  });

  it("requires a token when enforcement is on", async () => {
    const env = {
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site",
      TURNSTILE_SECRET_KEY: "secret",
    };
    expect(isTurnstileEnforced(env)).toBe(true);
    const result = await verifyTurnstileToken("", { env });
    expect(result).toEqual({ ok: false, reason: "missing_token" });
  });

  it("accepts a successful Siteverify response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const env = {
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site",
      TURNSTILE_SECRET_KEY: "secret",
    };
    const result = await verifyTurnstileToken("token-123", { env, remoteIp: "203.0.113.1" });
    expect(result).toEqual({ ok: true, skipped: false });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const bodyText = typeof init.body === "string" ? init.body : String(init.body);
    expect(bodyText).toContain("token-123");
    expect(bodyText).toContain("secret");
  });

  it("rejects failed Siteverify responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false }),
      }),
    );
    const env = {
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site",
      TURNSTILE_SECRET_KEY: "secret",
    };
    const result = await verifyTurnstileToken("bad", { env });
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });
});