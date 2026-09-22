import type { Metadata } from "next";
import { QviStudioApp } from "@/components/studio/QviStudioApp";
import { siteConfig } from "@/lib/site";

const title = "QVI Studio";
const description = "Miniature multitrack studio in the browser. Mix tracks, change tempo and pitch, and play on your device.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: { canonical: "/studio" },
    openGraph: {
      title,
      description,
      url: `${siteConfig.url}/studio`,
    },
  };
}

export default function StudioPage() {
  return <QviStudioApp />;
}
