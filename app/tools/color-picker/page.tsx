import { ColorPicker } from "@/components/tools/ColorPicker";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["color-picker"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function ColorPickerPage() {
  return (
    <LiveToolView slug="color-picker">
      <ColorPicker />
    </LiveToolView>
  );
}
