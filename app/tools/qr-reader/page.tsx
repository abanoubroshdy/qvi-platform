import type { Metadata } from "next";
import { QrReader } from "@/components/tools/QrReader";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "قارئ رمز QR من صورة — بدون كاميرا وبدون رفع";
const pageDescription =
  "افك رمز QR من صورة أو لقطة شاشة على جهازك. لا كاميرا ولا رفع إلى خادم — jsQR يعمل في المتصفح.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/qr-reader" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/qr-reader`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

export default function QrReaderPage() {
  return (
    <LiveToolView slug="qr-reader">
      <QrReader />
    </LiveToolView>
  );
}
