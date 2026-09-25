import { JsonLd } from "@/components/JsonLd";
import { NeyoraView } from "@/components/views/NeyoraView";
import { pageMeta } from "@/lib/page-meta";
import { buildPageMetadata, neyoraPageJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: pageMeta.neyora.title,
  description: pageMeta.neyora.description,
  path: pageMeta.neyora.path,
  absolute: true,
});

export default function NeyoraPage() {
  return (
    <>
      <JsonLd data={neyoraPageJsonLd()} />
      <NeyoraView />
    </>
  );
}
