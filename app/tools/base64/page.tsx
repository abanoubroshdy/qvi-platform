import type { Metadata } from "next";
import { Base64Tool } from "@/components/tools/Base64Tool";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "أداة Base64 ترميز وفك ترميز — بدون رفع";
const pageDescription =
  "رمّز نصًا أو ملفات إلى Base64 وفك الترميز إلى نص داخل المتصفح. بلا رفع وبلا حساب.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/base64" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/base64`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

export default function Base64Page() {
  return (
    <LiveToolView slug="base64">
      <Base64Tool />
    </LiveToolView>
  );
}
