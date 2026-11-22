import { NextResponse } from "next/server";
import { clientIpFromRequest } from "@/lib/auth/request-ip";
import { validateSignIn } from "@/lib/auth/profile";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { isTurnstileEnforced, verifyTurnstileToken } from "@/lib/turnstile";

export const runtime = "nodejs";

type SigninPayload = {
  email?: string;
  password?: string;
  turnstileToken?: string;
};

export async function POST(request: Request) {
  let body: SigninPayload;
  try {
    body = (await request.json()) as SigninPayload;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const validationIssue = validateSignIn(email, password);
  if (validationIssue) {
    return NextResponse.json({ error: "validation", issue: validationIssue }, { status: 400 });
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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return NextResponse.json(
      { error: "signin_failed", message: error?.message ?? "invalid_credentials" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  });
}