import type { Metadata } from "next";
import { PngToPdf } from "@/components/tools/PngToPdf";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "Convert PNG to PDF Online — No Upload";
const pageDescription =
  "Turn PNG images into a PDF for sharing or print, entirely in your browser. Merge several images, with fully local processing.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/png-to-pdf" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/png-to-pdf`,
      locale: "en_US",
      type: "article",
    },
  };
}

export default function PngToPdfPage() {
  return (
    <LiveToolView slug="png-to-pdf">
      <PngToPdf />
    </LiveToolView>
  );
}
