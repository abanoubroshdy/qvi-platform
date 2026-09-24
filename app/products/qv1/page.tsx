import type { Metadata } from "next";
import { Qv1View } from "@/components/views/Qv1View";
import { siteConfig } from "@/lib/site";

const pageTitle = "QV1 - AI Stem Separation Tool";
const pageDescription =
  "QV1 is QVI’s desktop audio engine for stem separation, de-noise, and remix. It is a core product, not a free browser tool.";

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
