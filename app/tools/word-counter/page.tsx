import type { Metadata } from "next";
import { WordCounter } from "@/components/tools/WordCounter";
import { LiveToolView } from "@/components/views/LiveToolView";
import { siteConfig } from "@/lib/site";

const pageTitle = "عدّاد الكلمات والأحرف أونلاين — مجاني";
const pageDescription =
  "احسب الكلمات والأحرف والجمل والفقرات وزمن القراءة أثناء الكتابة. العدّ يتم في المتصفح ولا يُرفع النص.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/word-counter" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/word-counter`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

export default function WordCounterPage() {
  return (
    <LiveToolView slug="word-counter">
      <WordCounter />
    </LiveToolView>
  );
}
