import { Qv1View } from "@/components/views/Qv1View";
import { pageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: pageMeta.qv1.title,
  description: pageMeta.qv1.description,
  path: pageMeta.qv1.path,
  absolute: true,
  canonicalPath: "/qv1",
});

export default function Qv1Page() {
  return <Qv1View />;
}
