import { PrivacyView } from "@/components/views/LegalViews";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "QVI privacy policy: account and waitlist data, the QV1 desktop app, on-device tools, and your rights.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return <PrivacyView />;
}
