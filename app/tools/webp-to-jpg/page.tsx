import { WebpToJpg } from "@/components/tools/WebpToJpg";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["webp-to-jpg"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function WebpToJpgPage() {
  return (
    <LiveToolView slug="webp-to-jpg">
      <WebpToJpg />
    </LiveToolView>
  );
}
