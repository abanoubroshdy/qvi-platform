import type { Metadata } from "next";
import { NeyoraView } from "@/components/views/NeyoraView";
import { siteConfig } from "@/lib/site";

const pageTitle = "Neyora - DDSP Instrument Synthesis";
const pageDescription =
  "Neyora is QVI’s desktop DDSP instrument for text, voice, or MIDI. A core product, still in the lab — not a free browser utility.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/products/neyora" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: `${siteConfig.url}/products/neyora`,
    type: "website",
  },
};

export default function NeyoraPage() {
  return <NeyoraView />;
}
