import { ImageResizer } from "@/components/tools/ImageResizer";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["image-resizer"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function ImageResizerPage() {
  return (
    <LiveToolView slug="image-resizer">
      <ImageResizer />
    </LiveToolView>
  );
}
