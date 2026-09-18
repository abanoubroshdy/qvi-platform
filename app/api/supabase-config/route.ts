import { NextResponse } from "next/server";
import { resolvePublicSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  const config = resolvePublicSupabaseConfig();
  if (!config) {
    return NextResponse.json(
      { configured: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { configured: true, url: config.url, anonKey: config.anonKey },
    { headers: { "Cache-Control": "no-store" } },
  );
}
