import { Base64Tool } from "@/components/tools/Base64Tool";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["base64"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function Base64Page() {
  return (
    <LiveToolView slug="base64">
      <Base64Tool />
    </LiveToolView>
  );
}
