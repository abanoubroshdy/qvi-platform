import { TermsView } from "@/components/views/LegalViews";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Terms of Use",
  description: "Terms of use for the QVI platform, products, and free browser tools.",
  path: "/terms",
});

export default function TermsPage() {
  return <TermsView />;
}
