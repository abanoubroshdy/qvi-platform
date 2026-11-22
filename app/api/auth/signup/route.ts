import { NextResponse } from "next/server";
import { assessSignupEmail } from "@/lib/auth/disposable-domains";
import { clientIpFromRequest } from "@/lib/auth/request-ip";
import { toAuthMetadata, validateSignUpInput, type SignUpInput } from "@/lib/auth/profile";
import { safeNextPath } from "@/lib/safe-next-path";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { isTurnstileEnforced, verifyTurnstileToken } from "@/lib/turnstile";

export const runtime = "nodejs";

type SignupPayload = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
  country?: string;
  ageConfirmed?: boolean;
  privacyConsent?: boolean;
  marketingConsent?: boolean;
  turnstileToken?: string;
  nextPath?: string;
};

function parseSignupInput(body: SignupPayload): SignUpInput | null {
  if (!body || typeof body !== "object") return null;
  return {
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
    password: typeof body.password === "string" ? body.password : "",
    confirmPassword: typeof body.confirmPassword === "string" ? body.confirmPassword : "",
    fullName: typeof body.fullName === "string" ? body.fullName : "",
    country: typeof body.country === "string" ? body.country : "",
    ageConfirmed: body.ageConfirmed === true,
    privacyConsent: body.privacyConsent === true,
    marketingConsent: body.marketingConsent === true,
  };
}

export async function POST(request: Request) {
  let body: SignupPayload;
  try {
    body = (await request.json()) as SignupPayload;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const input = parseSignupInput(body);
  if (!input) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const validationIssue = validateSignUpInput(input);
  if (validationIssue) {
    return NextResponse.json({ error: "validation", issue: validationIssue }, { status: 400 });
  }

  const emailCheck = assessSignupEmail(input.email);
  if (!emailCheck.ok) {
    if (emailCheck.code === "email_typo") {
      return NextResponse.json(
        { error: emailCheck.code, domain: emailCheck.domain, suggestion: emailCheck.suggestion },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: emailCheck.code, domain: emailCheck.domain }, { status: 400 });
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

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const destination = safeNextPath(typeof body.nextPath === "string" ? body.nextPath : "/account");
  const emailRedirectTo = origin
    ? `${origin.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(destination)}`
    : undefined;

  const fields = {
    fullName: input.fullName,
    country: input.country,
    ageConfirmed: true,
    privacyConsent: true,
    marketingConsent: Boolean(input.marketingConsent),
  };

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo,
      data: {
        ...toAuthMetadata(fields),
        privacy_consent: true,
        marketing_consent: fields.marketingConsent,
      },
    },
  });

  if (error) {
    const status = /rate|limit/i.test(error.message) ? 429 : 400;
    return NextResponse.json({ error: "signup_failed", message: error.message }, { status });
  }

  if (data.session) {
    return NextResponse.json({
      ok: true,
      email: input.email,
      session: data.session,
      confirmed: true,
    });
  }

  return NextResponse.json({ ok: true, email: input.email, confirmed: false });
}