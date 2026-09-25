import { QrReader } from "@/components/tools/QrReader";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["qr-reader"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function QrReaderPage() {
  return (
    <LiveToolView slug="qr-reader">
      <QrReader />
    </LiveToolView>
  );
}
