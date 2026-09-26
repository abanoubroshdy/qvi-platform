import { VideoConverter } from "@/components/tools/VideoConverter";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["video-converter"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function VideoConverterPage() {
  return (
    <LiveToolView slug="video-converter">
      <VideoConverter />
    </LiveToolView>
  );
}
