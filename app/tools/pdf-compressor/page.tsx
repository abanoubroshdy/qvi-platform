import type { Metadata } from "next";
import { PdfCompressor } from "@/components/tools/PdfCompressor";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "ضغط PDF أونلاين — بدون رفع";
const pageDescription = "قلل حجم ملف PDF في المتصفح مع معاينة ومقارنة الحجم. الملف لا يُرفع إلى خادم.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/pdf-compressor" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/pdf-compressor`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

export default function PdfCompressorPage() {
  return (
    <LiveToolView slug="pdf-compressor">
      <PdfCompressor />
    </LiveToolView>
  );
}
