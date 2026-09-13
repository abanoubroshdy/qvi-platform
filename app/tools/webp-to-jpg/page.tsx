import type { Metadata } from "next";
import { ToolPage } from "@/components/ToolPage";
import { WebpToJpg } from "@/components/tools/WebpToJpg";
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

const faqs = [
  {
    question: "Is the WEBP file uploaded?",
    answer: "No. Conversion happens in the browser with Canvas. The file stays on your device and is exported as JPG locally.",
  },
  {
    question: "Why does transparency become white?",
    answer: "JPG has no alpha channel. The image is drawn on a white background so transparent areas do not turn black.",
  },
  {
    question: "Are dimensions preserved?",
    answer: "Yes. Width and height stay the same. You only change format and JPEG quality.",
  },
  {
    question: "Which browsers work?",
    answer: "Any modern browser with WEBP and Canvas support, including Chrome, Firefox, Safari, and Edge on phone and desktop.",
  },
  {
    question: "Is conversion free?",
    answer: "Yes. No account and no daily limit. Convert as many images as you need on your device.",
  },
];

const howToSteps = [
  "Drop a WEBP file or choose it from your device.",
  "Adjust JPG quality if you want a smaller or sharper file.",
  "Wait for instant conversion or tap Convert to JPG.",
  "Preview the result, then download the JPG.",
];

export default function WebpToJpgPage() {
  return (
    <ToolPage
      category="Image tools"
      title="Convert WEBP to JPG — no upload"
      description="Make WEBP files work in apps and sites that prefer JPG. Conversion is instant and stays on your device."
      howToTitle="How do I convert WEBP to JPG?"
      howToSteps={howToSteps}
      howToNote="We do not keep a copy of your image. Close the page and it leaves browser memory."
      faqs={faqs}
      jsonLdName="WEBP to JPG | QVI"
      canonicalPath="/tools/webp-to-jpg"
      applicationCategory="MultimediaApplication"
    >
      <WebpToJpg />
    </ToolPage>
  );
}
