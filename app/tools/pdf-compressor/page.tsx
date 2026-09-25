import { PdfCompressor } from "@/components/tools/PdfCompressor";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["pdf-compressor"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function PdfCompressorPage() {
  return (
    <LiveToolView slug="pdf-compressor">
      <PdfCompressor />
    </LiveToolView>
  );
}
