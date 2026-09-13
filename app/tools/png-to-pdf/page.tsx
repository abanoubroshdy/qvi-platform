import type { Metadata } from "next";
import { ToolPage } from "@/components/ToolPage";
import { PngToPdf } from "@/components/tools/PngToPdf";
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

const faqs = [
  {
    question: "Is the PNG uploaded to a server?",
    answer: "No. The tool uses pdf-lib inside the browser to build the document locally. There is no upload API.",
  },
  {
    question: "Can I convert more than one image?",
    answer: "Yes. Pick several PNGs and each image becomes its own page in one PDF, in the order you selected.",
  },
  {
    question: "Is PNG transparency kept?",
    answer: "Yes where the format allows. Images are embedded as PNG inside the PDF, so transparent areas stay over the page background.",
  },
  {
    question: "What page size do I get?",
    answer: "Each page follows the image, capped near A4 so the file does not become awkwardly huge to view or print.",
  },
  {
    question: "Do I need extra software?",
    answer: "No. A modern browser is enough. After download, open the file in any PDF reader on phone or desktop.",
  },
];

const howToSteps = [
  "Drop one or more PNG images on the conversion area.",
  "Check the thumbnails to confirm the right files.",
  "Wait for the PDF to build, or tap Convert to PDF.",
  "Preview the document on the page, then download it.",
];

export default function PngToPdfPage() {
  return (
    <ToolPage
      category="PDF tools"
      title="Convert PNG to PDF — no upload"
      description="Collect images into an ordered PDF in seconds. Useful for sharing, archiving, and print — files stay on your device."
      howToTitle="How do I convert PNG to PDF?"
      howToSteps={howToSteps}
      howToNote="We never see or store your images. The PDF is created in the browser, then downloaded to you."
      faqs={faqs}
      jsonLdName="PNG to PDF | QVI"
      canonicalPath="/tools/png-to-pdf"
      applicationCategory="FileApplication"
    >
      <PngToPdf />
    </ToolPage>
  );
}
