import { PrivacyView } from "@/components/views/LegalViews";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "QVI privacy policy: account and waitlist data, on-device tools, contact form email delivery, and your rights.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return <PrivacyView />;
}
