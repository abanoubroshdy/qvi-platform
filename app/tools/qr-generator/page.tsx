import type { Metadata } from "next";
import { QrGenerator } from "@/components/tools/QrGenerator";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "Free QR Code Generator Online";
const pageDescription =
  "Create a QR code from any link or text and download a high-quality PNG. Generation runs on your device — nothing is sent to a server.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/qr-generator" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/qr-generator`,
      locale: "en_US",
      type: "article",
    },
  };
}

export default function QrGeneratorPage() {
  return (
    <LiveToolView slug="qr-generator">
      <QrGenerator />
    </LiveToolView>
  );
}
