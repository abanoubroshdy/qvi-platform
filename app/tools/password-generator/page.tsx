import { PasswordGenerator } from "@/components/tools/PasswordGenerator";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["password-generator"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function PasswordGeneratorPage() {
  return (
    <LiveToolView slug="password-generator">
      <PasswordGenerator />
    </LiveToolView>
  );
}
