import type { Metadata } from "next";
import { PrivacyView } from "@/components/views/LegalViews";

export const metadata: Metadata = {
  title: "سياسة الخصوصية - QVI",
  description:
    "سياسة خصوصية QVI: البيانات التي نجمعها عند إنشاء الحساب وقائمة الانتظار، وكيف نستخدمها، وحقوقك وفق القانون المصري رقم 151 لسنة 2020.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return <PrivacyView />;
}
