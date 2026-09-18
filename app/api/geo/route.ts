import { NextResponse } from "next/server";
import { isCountryCode } from "@/lib/geo/countries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET(request: Request) {
  const raw =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-country-code");
  const country = raw?.trim().toUpperCase();
  if (!country || country === "XX" || !isCountryCode(country)) {
    return NextResponse.json({ country: null }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ country }, { headers: { "Cache-Control": "no-store" } });
}
