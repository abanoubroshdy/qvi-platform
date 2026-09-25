import { NextResponse } from "next/server";
import {
  planQv1Download,
  presignQv1Object,
  qv1DownloadLocation,
  resolveR2DownloadConfig,
} from "@/lib/qv1-download";
import { qv1Release } from "@/lib/qv1-release";
import { countRecentQv1Downloads, insertQv1Download } from "@/lib/supabase/qv1-downloads";
import { getRequestSupabaseSession } from "@/lib/supabase/request-session";

/** Read R2 credentials and the Supabase session on each request. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getRequestSupabaseSession(request);
  const config = resolveR2DownloadConfig(process.env);
  let recentCount = 0;

  if (session && config) {
    try {
      recentCount = await countRecentQv1Downloads(session.client, session.userId);
    } catch {
      const location = new URL(qv1DownloadLocation({ kind: "unavailable" }), request.url);
      return NextResponse.redirect(location, 307);
    }
  }

  const decision = await planQv1Download({
    userId: session?.userId ?? null,
    config,
    recentCount,
    sign: (r2) => presignQv1Object(r2, qv1Release.fileName),
    record: async () => {
      if (!session) throw new Error("missing session");
      await insertQv1Download(session.client, {
        userId: session.userId,
        version: qv1Release.version,
        userAgent: request.headers.get("user-agent"),
      });
    },
  });

  const target = qv1DownloadLocation(decision);
  const location = target.startsWith("/") ? new URL(target, request.url) : target;
  return NextResponse.redirect(location, 307);
}
