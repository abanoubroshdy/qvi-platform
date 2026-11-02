import { NextResponse } from "next/server";
import { cloudflareRequestCountry } from "@/lib/geo/cloudflare-country";
import { resolveGeoCountry } from "@/lib/geo/request-country";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET(request: Request) {
  const country = resolveGeoCountry({
    ...cloudflareRequestCountry(request),
    headers: request.headers,
  });
  return NextResponse.json(
    { country },
    { headers: { "Cache-Control": "no-store" } },
  );
}
