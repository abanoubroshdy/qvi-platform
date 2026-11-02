import { NextResponse } from "next/server";
import {
  QV1_DOWNLOAD_ENABLED,
  QV1_DOWNLOAD_PAUSED_PATH,
  planQv1Download,
  QV1_PUBLIC_SETUP_URL,
  qv1DownloadErrorDetail,
  qv1DownloadLocation,
  qv1DownloadLogLine,
  resolveR2DownloadConfig,
} from "@/lib/qv1-download";
import { qv1Release } from "@/lib/qv1-release";
import { countRecentQv1Downloads, insertQv1Download } from "@/lib/supabase/qv1-downloads";
import { getRequestSupabaseSession } from "@/lib/supabase/request-session";

/** Read R2 credentials and the Supabase session on each request. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!QV1_DOWNLOAD_ENABLED) {
    return NextResponse.redirect(new URL(QV1_DOWNLOAD_PAUSED_PATH, request.url), 307);
  }

  const session = await getRequestSupabaseSession(request);
  // The Setup is public on downloads.getqvi.com; R2 credentials are no longer required.
  const config = resolveR2DownloadConfig(process.env) ?? {
    accountId: "public",
    accessKeyId: "public",
    secretAccessKey: "public",
    bucket: "qv1-downloads",
    objectKey: "qv1/QV1-Setup-Evaluation.exe",
  };
  let recentCount = 0;

  if (session && config) {
    try {
      recentCount = await countRecentQv1Downloads(session.client, session.userId);
    } catch (error) {
      console.error(qv1DownloadLogLine("history count", qv1DownloadErrorDetail(error)));
      recentCount = 0;
    }
  }

  const decision = await planQv1Download({
    userId: session?.userId ?? null,
    config,
    recentCount,
    sign: async () => QV1_PUBLIC_SETUP_URL,
    record: async () => {
      if (!session) throw new Error("missing session");
      await insertQv1Download(session.client, {
        userId: session.userId,
        version: qv1Release.version,
        userAgent: request.headers.get("user-agent"),
      });
    },
    report: (stage, error) => {
      console.error(qv1DownloadLogLine(stage, qv1DownloadErrorDetail(error)));
    },
  });

  const target = qv1DownloadLocation(decision);
  const location = target.startsWith("/") ? new URL(target, request.url) : target;
  return NextResponse.redirect(location, 307);
}
