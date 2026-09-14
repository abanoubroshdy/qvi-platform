import type { Metadata } from "next";
import { PdfMerger } from "@/components/tools/PdfMerger";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "دمج PDF أونلاين — بدون رفع";
const pageDescription = "اجمع عدة ملفات PDF في مستند واحد مرتب على جهازك. بلا رفع وبلا حساب.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/pdf-merger" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/pdf-merger`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

export default function PdfMergerPage() {
  return (
    <LiveToolView slug="pdf-merger">
      <PdfMerger />
    </LiveToolView>
  );
}
