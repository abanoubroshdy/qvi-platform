import type { Metadata } from "next";
import { PdfToWord } from "@/components/tools/PdfToWord";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "تحويل PDF إلى Word أونلاين — بدون رفع";
const pageDescription =
  "حوّل ملف PDF إلى مستند Word على جهازك مع الحفاظ على حجم الخط والعريض والصور. بلا رفع وبلا حساب.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/pdf-to-word" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/pdf-to-word`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

export default function PdfToWordPage() {
  return (
    <LiveToolView slug="pdf-to-word">
      <PdfToWord />
    </LiveToolView>
  );
}
