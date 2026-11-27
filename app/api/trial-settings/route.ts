import { NextResponse } from "next/server";
import { PRODUCT_CODES } from "@/lib/licensing/products";
import { resolveTrialProductCode } from "@/lib/licensing/trial-settings";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const client = createServiceSupabaseClient();
  if (!client) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const productCode = resolveTrialProductCode(url.searchParams.get("product")) ?? PRODUCT_CODES.neyoraPro;

  const { data, error } = await client
    .from("product_trial_settings")
    .select("enabled, duration_days")
    .eq("product_code", productCode)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enabled = data?.enabled ?? false;
  const duration_days = data?.duration_days ?? 14;

  return NextResponse.json(
    { enabled, duration_days, product: productCode },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}