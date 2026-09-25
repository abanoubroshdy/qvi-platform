import { JsonLd } from "@/components/JsonLd";
import { ContactView } from "@/components/views/LegalViews";
import { pageMeta } from "@/lib/page-meta";
import { buildPageMetadata, contactPageJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: pageMeta.contact.title,
  description: pageMeta.contact.description,
  path: pageMeta.contact.path,
  absolute: true,
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={contactPageJsonLd()} />
      <ContactView />
    </>
  );
}
