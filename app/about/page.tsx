import { JsonLd } from "@/components/JsonLd";
import { AboutView } from "@/components/views/LegalViews";
import { pageMeta } from "@/lib/page-meta";
import { aboutPageJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: pageMeta.about.title,
  description: pageMeta.about.description,
  path: pageMeta.about.path,
  absolute: true,
});

export default function AboutPage() {
  return (
    <>
      <JsonLd data={aboutPageJsonLd()} />
      <AboutView />
    </>
  );
}
