import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { HomeView } from "@/components/views/HomeView";
import { buildPageMetadata, homePageJsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

const homeTitle = "QVI - Quality Virtual Instruments | AI Audio Tools & Software";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: homeTitle,
    description: siteConfig.description,
    path: "/",
  }),
  title: { absolute: homeTitle },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={homePageJsonLd()} />
      <HomeView />
    </>
  );
}
