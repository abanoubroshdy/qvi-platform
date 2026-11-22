import { NextResponse } from "next/server";
import { clientIpFromRequest } from "@/lib/auth/request-ip";
import { isValidEmail } from "@/lib/auth/profile";
import { passwordResetOutcome, passwordResetRedirectUrl } from "@/lib/auth/recovery";
import type { Locale } from "@/lib/i18n";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { isTurnstileEnforced, verifyTurnstileToken } from "@/lib/turnstile";

export const runtime = "nodejs";

type ForgotPayload = {
  email?: string;
  locale?: string;
  turnstileToken?: string;
};

export async function POST(request: Request) {
  let body: ForgotPayload;
  try {
    body = (await request.json()) as ForgotPayload;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "validation", issue: "email" }, { status: 400 });
  }

  if (isTurnstileEnforced()) {
    const turnstile = await verifyTurnstileToken(body.turnstileToken, {
      remoteIp: clientIpFromRequest(request),
    });
    if (!turnstile.ok) {
      return NextResponse.json({ error: "turnstile", reason: turnstile.reason }, { status: 400 });
    }
  }

  const supabase = createServerAuthClient();
  if (!supabase) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const locale: Locale = body.locale === "ar" ? "ar" : "en";
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  const redirectTo = passwordResetRedirectUrl(origin, locale);
  if (!redirectTo) {
    return NextResponse.json({ error: "redirect" }, { status: 500 });
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  const outcome = passwordResetOutcome(error);
  if (outcome === "rate_limited") {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (outcome === "error") {
    return NextResponse.json({ error: "reset_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}