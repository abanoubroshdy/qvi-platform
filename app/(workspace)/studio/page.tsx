import { JsonLd } from "@/components/JsonLd";
import { QviStudioApp } from "@/components/studio/QviStudioApp";
import { pageMeta } from "@/lib/page-meta";
import { buildPageMetadata, studioPageJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: pageMeta.studio.title,
  description: pageMeta.studio.description,
  path: pageMeta.studio.path,
  absolute: true,
});

export default function StudioPage() {
  return (
    <>
      <JsonLd data={studioPageJsonLd()} />
      <QviStudioApp />
    </>
  );
}
