import type { Metadata } from "next";
import { ImageCompressor } from "@/components/tools/ImageCompressor";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "Free Image Compressor — No Upload";
const pageDescription =
  "Compress JPG, PNG, and WEBP in your browser. Free, instant, and your files never leave your device.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/image-compressor" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/image-compressor`,
      locale: "en_US",
      type: "article",
    },
  };
}

export default function ImageCompressorPage() {
  return (
    <LiveToolView slug="image-compressor">
      <ImageCompressor />
    </LiveToolView>
  );
}
