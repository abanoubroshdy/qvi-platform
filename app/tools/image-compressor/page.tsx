import { ImageCompressor } from "@/components/tools/ImageCompressor";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["image-compressor"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function ImageCompressorPage() {
  return (
    <LiveToolView slug="image-compressor">
      <ImageCompressor />
    </LiveToolView>
  );
}
