import { QrGenerator } from "@/components/tools/QrGenerator";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["qr-generator"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function QrGeneratorPage() {
  return (
    <LiveToolView slug="qr-generator">
      <QrGenerator />
    </LiveToolView>
  );
}
