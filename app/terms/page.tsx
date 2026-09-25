import { TermsView } from "@/components/views/LegalViews";
import { pageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: pageMeta.terms.title,
  description: pageMeta.terms.description,
  path: pageMeta.terms.path,
});

export default function TermsPage() {
  return <TermsView />;
}
