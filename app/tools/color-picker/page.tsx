import type { Metadata } from "next";
import { ColorPicker } from "@/components/tools/ColorPicker";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "منتقي الألوان أونلاين مجاناً — بدون رفع";
const pageDescription =
  "اختر لونًا وانسخ قيم HEX وRGB وHSL فورًا. التحويل يعمل في المتصفح والألوان الأخيرة تُحفظ على جهازك فقط.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/color-picker" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/color-picker`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

export default function ColorPickerPage() {
  return (
    <LiveToolView slug="color-picker">
      <ColorPicker />
    </LiveToolView>
  );
}
