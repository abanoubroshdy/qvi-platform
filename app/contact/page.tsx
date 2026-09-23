import { JsonLd } from "@/components/JsonLd";
import { ContactView } from "@/components/views/LegalViews";
import { buildPageMetadata, contactPageJsonLd } from "@/lib/seo";

const pageTitle = "Contact";
const pageDescription =
  "Contact QVI support at support@getqvi.com about QV1, Neyora, waitlists, your account, or the free tools.";

export const metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={contactPageJsonLd()} />
      <ContactView />
    </>
  );
}
