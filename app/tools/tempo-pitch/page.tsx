import type { Metadata } from "next";
import { TempoPitch } from "@/components/tools/TempoPitch";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "تغيير التيمبو والطبقة أونلاين — Tap للـ BPM";
const pageDescription =
  "اكتشف التيمبو التقريبي بزر Tap، غيّر السرعة بالـ BPM أو النسبة المئوية، وحرّك الطبقة بأنصاف التون والسنت دون لمس الزمن. المعالجة محلية عبر FFmpeg.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/tempo-pitch" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/tempo-pitch`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

export default function TempoPitchPage() {
  return (
    <LiveToolView slug="tempo-pitch">
      <TempoPitch />
    </LiveToolView>
  );
}
