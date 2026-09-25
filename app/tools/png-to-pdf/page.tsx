import { PngToPdf } from "@/components/tools/PngToPdf";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["png-to-pdf"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function PngToPdfPage() {
  return (
    <LiveToolView slug="png-to-pdf">
      <PngToPdf />
    </LiveToolView>
  );
}
