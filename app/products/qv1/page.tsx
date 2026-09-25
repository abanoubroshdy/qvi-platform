import { JsonLd } from "@/components/JsonLd";
import { Qv1View } from "@/components/views/Qv1View";
import { pageMeta } from "@/lib/page-meta";
import { buildPageMetadata, qv1PageJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: pageMeta.qv1.title,
  description: pageMeta.qv1.description,
  path: pageMeta.qv1.path,
  absolute: true,
});

export default function Qv1Page() {
  return (
    <>
      <JsonLd data={qv1PageJsonLd()} />
      <Qv1View />
    </>
  );
}
