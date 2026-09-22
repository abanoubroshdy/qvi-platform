import type { Metadata } from "next";
import { Mp3ToWav } from "@/components/tools/Mp3ToWav";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "تحويل أي صيغة صوت — دفعة واحدة بلا رفع";
const pageDescription =
  "حوّل MP3 أو WAV أو M4A أو AAC أو OGG أو FLAC أو Opus إلى MP3 أو WAV أو M4A أو OGG أو FLAC. عدة ملفات بإعدادات موحّدة وتنزيل ZIP داخل المتصفح.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/mp3-to-wav" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/mp3-to-wav`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

export default function Mp3ToWavPage() {
  return (
    <LiveToolView slug="mp3-to-wav">
      <Mp3ToWav />
    </LiveToolView>
  );
}
