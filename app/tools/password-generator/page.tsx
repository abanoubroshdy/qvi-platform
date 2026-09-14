import type { Metadata } from "next";
import { PasswordGenerator } from "@/components/tools/PasswordGenerator";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "مولّد كلمات مرور قوية أونلاين — مجاني وبدون رفع";
const pageDescription =
  "أنشئ كلمة مرور عشوائية بطول 6–32 حرفًا مع أحرف كبيرة وصغيرة وأرقام ورموز. التوليد يتم على جهازك عبر crypto.getRandomValues.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/password-generator" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/password-generator`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

export default function PasswordGeneratorPage() {
  return (
    <LiveToolView slug="password-generator">
      <PasswordGenerator />
    </LiveToolView>
  );
}
