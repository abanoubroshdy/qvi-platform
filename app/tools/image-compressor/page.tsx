import type { Metadata } from "next";
import { ToolPage } from "@/components/ToolPage";
import { ImageCompressor } from "@/components/tools/ImageCompressor";
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

const faqs = [
  {
    question: "Is my image uploaded to a server?",
    answer:
      "No. QVI’s image compressor runs entirely in your browser with a local compression library. The file is not sent to our servers and is not stored.",
  },
  {
    question: "Which formats are supported?",
    answer: "JPG, JPEG, PNG, WEBP, and BMP. After compression you can download the result immediately.",
  },
  {
    question: "Will quality drop after compression?",
    answer:
      "You control quality with the slider. 80% is a solid default. Lower it for a smaller file, or raise it if sharpness matters more.",
  },
  {
    question: "Is it free with no limits?",
    answer: "Yes. No account, no daily cap. Use it whenever you need it.",
  },
  {
    question: "Does it work on mobile?",
    answer: "Yes. The page is responsive on phones, tablets, and desktops. Pick from the camera roll or drop a file on a computer.",
  },
];

const howToSteps = [
  "Choose an image or drop it on the upload area.",
  "Set the quality slider for the size you need.",
  "Wait for instant compression or tap Compress image.",
  "Compare original vs compressed size, then download.",
];

export default function ImageCompressorPage() {
  return (
    <ToolPage
      category="Image tools"
      title="Compress images online — no upload"
      description="Shrink photos in seconds while keeping enough detail to share or send. Processing stays on your device."
      howToTitle="How do I compress an image?"
      howToSteps={howToSteps}
      howToNote="We do not keep copies of your photos and we do not ask for an account. Close the tab and the files leave browser memory."
      faqs={faqs}
      jsonLdName="Image Compressor | QVI"
      canonicalPath="/tools/image-compressor"
      applicationCategory="MultimediaApplication"
    >
      <ImageCompressor />
    </ToolPage>
  );
}
