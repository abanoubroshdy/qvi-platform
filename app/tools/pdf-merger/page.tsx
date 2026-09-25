import { PdfMerger } from "@/components/tools/PdfMerger";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["pdf-merger"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function PdfMergerPage() {
  return (
    <LiveToolView slug="pdf-merger">
      <PdfMerger />
    </LiveToolView>
  );
}
