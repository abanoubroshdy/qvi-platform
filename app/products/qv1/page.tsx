import type { Metadata } from "next";
import { Qv1View } from "@/components/views/Qv1View";
import { siteConfig } from "@/lib/site";

const pageTitle = "QV1 - AI Stem Separation Tool";
const pageDescription =
  "QV1 is QVI's professional AI engine for vocal and instrumental stem separation, de-noise, and remix workflows — designed to run on your device.";

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
