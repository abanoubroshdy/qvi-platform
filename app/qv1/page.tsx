import type { Metadata } from "next";
import { Qv1EvaluationView } from "@/components/qv1/Qv1EvaluationView";
import { buildPageMetadata } from "@/lib/seo";

const pageTitle = "QV1 Evaluation";
const pageDescription =
  "Download QV1 Evaluation for Windows. Free 4 AI stems (vocals, drums, bass, other) with non-commercial third-party models. Drum Split (DSP) is Pro, coming soon.";

export const metadata: Metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/qv1",
});

type Qv1PageProps = {
  searchParams?: { download?: string | string[] };
};

export default function Qv1EvaluationPage({ searchParams }: Qv1PageProps) {
  const flag = searchParams?.download;
  const downloadSoon = flag === "soon" || (Array.isArray(flag) && flag.includes("soon"));
  return <Qv1EvaluationView downloadSoon={downloadSoon} />;
}
