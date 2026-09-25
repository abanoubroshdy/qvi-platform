import { TempoPitch } from "@/components/tools/TempoPitch";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["tempo-pitch"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function TempoPitchPage() {
  return (
    <LiveToolView slug="tempo-pitch">
      <TempoPitch />
    </LiveToolView>
  );
}
