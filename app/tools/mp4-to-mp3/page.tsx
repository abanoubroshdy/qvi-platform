import type { Metadata } from "next";
import { Mp4ToMp3 } from "@/components/tools/Mp4ToMp3";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "تحويل فيديو إلى MP3 - استخراج الصوت";
const pageDescription =
  "استخرج الصوت من MP4 وWEBM وMOV إلى MP3 داخل المتصفح. بلا رفع إلى خادم.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/mp4-to-mp3" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/mp4-to-mp3`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

export default function Mp4ToMp3Page() {
  return (
    <LiveToolView slug="mp4-to-mp3">
      <Mp4ToMp3 />
    </LiveToolView>
  );
}
