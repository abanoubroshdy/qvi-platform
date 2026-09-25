import { JsonLd } from "@/components/JsonLd";
import { HomeView } from "@/components/views/HomeView";
import { pageMeta } from "@/lib/page-meta";
import { buildPageMetadata, homePageJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: pageMeta.home.title,
  description: pageMeta.home.description,
  path: pageMeta.home.path,
  absolute: true,
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={homePageJsonLd()} />
      <HomeView />
    </>
  );
}
