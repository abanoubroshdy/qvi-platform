import { QviStudioApp } from "@/components/studio/QviStudioApp";
import { pageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: pageMeta.studio.title,
  description: pageMeta.studio.description,
  path: pageMeta.studio.path,
  absolute: true,
});

export default function StudioPage() {
  return <QviStudioApp />;
}
