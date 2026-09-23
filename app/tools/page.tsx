import { ToolsHubView } from "@/components/views/ToolsHubView";
import { buildPageMetadata } from "@/lib/seo";

const pageTitle = "Free tools";
const pageDescription =
  "QVI free browser tools grouped by audio, PDF, images, text, and quick utilities. Files stay on your device.";

export const metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/tools",
});

export default function ToolsHubPage() {
  return <ToolsHubView />;
}
