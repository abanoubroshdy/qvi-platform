import type { Metadata } from "next";
import { WebpToJpg } from "@/components/tools/WebpToJpg";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "Convert WEBP to JPG Online — No Upload";
const pageDescription =
  "Convert WEBP images to compatible JPG files in your browser. Free, instant, and nothing is uploaded.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/webp-to-jpg" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/webp-to-jpg`,
      locale: "en_US",
      type: "article",
    },
  };
}

export default function WebpToJpgPage() {
  return (
    <LiveToolView slug="webp-to-jpg">
      <WebpToJpg />
    </LiveToolView>
  );
}
