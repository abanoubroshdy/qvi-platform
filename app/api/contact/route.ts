import { NextResponse } from "next/server";
import { persistContactSubmission, sendContactEmail, validateContactPayload } from "@/lib/contact";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

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

  const service = createServiceSupabaseClient();
  if (service) {
    const saved = await persistContactSubmission(service, parsed.data);
    if (!saved.ok) {
      console.error("[contact] failed to persist submission:", saved.error);
    }
  }

  return NextResponse.json({ ok: true });
}
