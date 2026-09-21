import type { Metadata } from "next";
import { AudioCutter } from "@/components/tools/AudioCutter";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "قص الصوت أونلاين — فيد وجودة التصدير";
const pageDescription =
  "اقطع مقطعًا صوتيًا، أضف فيد دخول وخروج، وقارن جودة المصدر بإعدادات التصدير (هرتز وبيت ريت). المعالجة محلية عبر FFmpeg.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/audio-cutter" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/audio-cutter`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

export default function AudioCutterPage() {
  return (
    <LiveToolView slug="audio-cutter">
      <AudioCutter />
    </LiveToolView>
  );
}
