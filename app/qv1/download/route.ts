import { NextResponse } from "next/server";
import { resolveQv1DownloadRedirect } from "@/lib/qv1-download";

/** Read QV1_DOWNLOAD_URL on each request so a later Vercel env change is honored. */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const decision = resolveQv1DownloadRedirect(process.env.QV1_DOWNLOAD_URL);
  const location = decision.location.startsWith("/")
    ? new URL(decision.location, request.url)
    : decision.location;
  return NextResponse.redirect(location, decision.status);
}
