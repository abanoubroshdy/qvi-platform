import type { Metadata } from "next";
import { ToolPage } from "@/components/ToolPage";
import { QrGenerator } from "@/components/tools/QrGenerator";
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

const faqs = [
  {
    question: "Is my text or URL sent to a server?",
    answer: "No. The QR code is drawn in the browser with the qrcode library. What you type is not uploaded or stored by us.",
  },
  {
    question: "Does it support Arabic or other scripts?",
    answer: "Yes. You can encode Arabic or English text and URLs. Keep the payload short so it stays easy to scan.",
  },
  {
    question: "What error-correction level is used?",
    answer: "Medium (M) balances data capacity with resistance to light damage when printed or photographed.",
  },
  {
    question: "What format do I download?",
    answer: "A square PNG. Size can be 256 to 1024 pixels depending on screen or print use.",
  },
  {
    question: "Do I need an app to scan it later?",
    answer: "Most phone cameras read QR codes directly. For print, pick a larger size so it stays clear after shrinking.",
  },
];

const howToSteps = [
  "Type a URL or any text in the field.",
  "Set image size for screen or print.",
  "The code generates instantly, or tap Create code.",
  "Download the PNG and use it on a site or in print.",
];

export default function QrGeneratorPage() {
  return (
    <ToolPage
      category="QR tools"
      title="QR code generator — no upload"
      description="Turn any link or text into a downloadable QR code. Useful for cards, menus, and site URLs, with full privacy."
      howToTitle="How do I create a QR code?"
      howToSteps={howToSteps}
      howToNote="We do not log what you type. Close the page and nothing remains on our servers — it was never sent."
      faqs={faqs}
      jsonLdName="QR Generator | QVI"
      canonicalPath="/tools/qr-generator"
      applicationCategory="UtilitiesApplication"
    >
      <QrGenerator />
    </ToolPage>
  );
}
