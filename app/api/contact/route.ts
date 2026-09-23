import { NextResponse } from "next/server";
import { sendContactEmail, validateContactPayload } from "@/lib/contact";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = validateContactPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (parsed.honeypot) {
    return NextResponse.json({ ok: true });
  }

  const sent = await sendContactEmail(parsed.data);
  if (!sent.ok) {
    const status = sent.reason === "not_configured" ? 503 : 502;
    return NextResponse.json({ error: sent.reason }, { status });
  }

  return NextResponse.json({ ok: true });
}
