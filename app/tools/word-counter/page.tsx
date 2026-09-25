import { WordCounter } from "@/components/tools/WordCounter";
import { LiveToolView } from "@/components/views/LiveToolView";
import { toolPageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

const meta = toolPageMeta["word-counter"];

export const metadata = buildPageMetadata({
  title: meta.title,
  description: meta.description,
  path: meta.path,
  absolute: true,
});

export default function WordCounterPage() {
  return (
    <LiveToolView slug="word-counter">
      <WordCounter />
    </LiveToolView>
  );
}
