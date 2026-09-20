import type { Metadata } from "next";
import { ToolsHubView } from "@/components/views/ToolsHubView";
import { siteConfig } from "@/lib/site";

const pageTitle = "Free tools";
const pageDescription =
  "QVI free browser tools grouped by audio, PDF, images, text, and quick utilities. Files stay on your device.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/tools" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: `${siteConfig.url}/tools`,
    type: "website",
  },
};

export default function ToolsHubPage() {
  return <ToolsHubView />;
}
