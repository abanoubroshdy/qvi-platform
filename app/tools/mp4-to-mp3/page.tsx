import { Mp4ToMp3 } from "@/components/tools/Mp4ToMp3";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["mp4-to-mp3"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function Mp4ToMp3Page() {
  return (
    <LiveToolView slug="mp4-to-mp3">
      <Mp4ToMp3 />
    </LiveToolView>
  );
}
