import { Mp3ToWav } from "@/components/tools/Mp3ToWav";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["mp3-to-wav"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function Mp3ToWavPage() {
  return (
    <LiveToolView slug="mp3-to-wav">
      <Mp3ToWav />
    </LiveToolView>
  );
}
