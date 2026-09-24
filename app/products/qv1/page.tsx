import type { Metadata } from "next";
import { Qv1View } from "@/components/views/Qv1View";
import { siteConfig } from "@/lib/site";

const pageTitle = "QV1 - 4 AI stems";
const pageDescription =
  "QV1 Evaluation for Windows separates a mix into 4 AI stems (vocals, drums, bass, other) with non-commercial third-party models. Drum Split (DSP) is Pro, coming soon.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/products/qv1" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: `${siteConfig.url}/products/qv1`,
    type: "website",
  },
};

export default function Qv1Page() {
  return <Qv1View />;
}
