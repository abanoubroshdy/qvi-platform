import { PdfToWord } from "@/components/tools/PdfToWord";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["pdf-to-word"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function PdfToWordPage() {
  return (
    <LiveToolView slug="pdf-to-word">
      <PdfToWord />
    </LiveToolView>
  );
}
