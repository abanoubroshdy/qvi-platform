import { JsonLd } from "@/components/JsonLd";
import { AboutView } from "@/components/views/LegalViews";
import { aboutPageJsonLd, buildPageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = buildPageMetadata({
  title: "About",
  description: `${siteConfig.fullName} builds intelligent audio software on your device, plus free local browser utilities.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd data={aboutPageJsonLd()} />
      <AboutView />
    </>
  );
}
