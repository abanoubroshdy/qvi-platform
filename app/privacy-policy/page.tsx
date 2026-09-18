import type { Metadata } from "next";
import { PrivacyView } from "@/components/views/LegalViews";

export const metadata: Metadata = {
  title: "سياسة الخصوصية - QVI",
  description:
    "سياسة خصوصية QVI — Quality Virtual Instruments. سيتم تحديث المحتوى قريباً.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return <PrivacyView />;
}
