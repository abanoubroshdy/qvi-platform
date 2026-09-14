import type { Metadata } from "next";
import { ImageResizer } from "@/components/tools/ImageResizer";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "تغيير حجم الصورة أونلاين — بدون رفع";
const pageDescription =
  "غيّر عرض الصورة وارتفاعها بالبكسل مع قفل نسبة الأبعاد. المعالجة عبر Canvas على جهازك ومقارنة الحجم قبل التنزيل.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/image-resizer" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/image-resizer`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

export default function ImageResizerPage() {
  return (
    <LiveToolView slug="image-resizer">
      <ImageResizer />
    </LiveToolView>
  );
}
