import type { Metadata } from "next";
import { Qv1EvaluationView } from "@/components/qv1/Qv1EvaluationView";
import type { Qv1DownloadNotice } from "@/lib/qv1-release";
import { buildPageMetadata } from "@/lib/seo";

const pageTitle = "QV1 Evaluation";
const pageDescription =
  "Download QV1 Evaluation for Windows, free. 4 AI stems (vocals, drums, bass, other) with non-commercial third-party models, plus Drum Split (DSP), stem editing, and mix tools.";

export const metadata: Metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/qv1",
});

type Qv1PageProps = {
  searchParams?: { download?: string | string[] };
};

function noticeFrom(flag: string | string[] | undefined): Qv1DownloadNotice {
  const value = Array.isArray(flag) ? flag[0] : flag;
  if (value === "soon" || value === "limited" || value === "unavailable") return value;
  return "ready";
}

export default function Qv1EvaluationPage({ searchParams }: Qv1PageProps) {
  return <Qv1EvaluationView notice={noticeFrom(searchParams?.download)} />;
}
