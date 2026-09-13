import type { Metadata } from "next";
import { PrivacyView } from "@/components/views/LegalViews";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for QVI - Quality Virtual Instruments: on-device processing, cookies, and advertising.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return <PrivacyView />;
}
