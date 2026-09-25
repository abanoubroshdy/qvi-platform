import type { Metadata } from "next";
import { Qv1View } from "@/components/views/Qv1View";
import { siteConfig } from "@/lib/site";

const pageTitle = "QV1 Evaluation";
const pageDescription =
  "QV1 Evaluation is a free Windows app: 4 AI stems with non-commercial third-party models, plus Drum Split (DSP), stem editing, and mix tools.";

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
