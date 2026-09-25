import { AudioCutter } from "@/components/tools/AudioCutter";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["audio-cutter"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function AudioCutterPage() {
  return (
    <LiveToolView slug="audio-cutter">
      <AudioCutter />
    </LiveToolView>
  );
}
