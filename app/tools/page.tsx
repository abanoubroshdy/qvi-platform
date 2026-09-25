import { ToolsHubView } from "@/components/views/ToolsHubView";
import { pageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: pageMeta.tools.title,
  description: pageMeta.tools.description,
  path: pageMeta.tools.path,
  absolute: true,
});

export default function ToolsHubPage() {
  return <ToolsHubView />;
}
