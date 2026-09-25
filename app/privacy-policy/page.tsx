import { PrivacyView } from "@/components/views/LegalViews";
import { pageMeta } from "@/lib/page-meta";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: pageMeta.privacy.title,
  description: pageMeta.privacy.description,
  path: pageMeta.privacy.path,
});

export default function PrivacyPolicyPage() {
  return <PrivacyView />;
}
