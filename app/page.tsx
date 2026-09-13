import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ShieldCheck, Zap } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { ToolCard } from "@/components/ToolCard";
import { siteConfig } from "@/lib/site";
import { tools } from "@/lib/tools";

export const metadata: Metadata = {
  title: "تولز عرب | أدوات مجانية 100٪ تعمل على جهازك وتحافظ على خصوصيتك",
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const highlights = [
  {
    icon: ShieldCheck,
    title: "خصوصية حقيقية",
    text: "ملفاتك لا تغادر متصفحك. لا حسابات، ولا تتبع لعملك.",
  },
  {
    icon: Zap,
    title: "نتائج فورية",
    text: "الأدوات تعمل محلياً بسرعة عالية حتى على الجوال.",
  },
  {
    icon: Lock,
    title: "مجانية بالكامل",
    text: "استخدم الأدوات بلا حدود يومية وبلا رسوم خفية.",
  },
];

export default function HomePage() {
  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          url: siteConfig.url,
          inLanguage: "ar",
          description: siteConfig.description,
        }}
      />

      <section className="hero-grid border-b">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16 lg:py-20">
          <p className="mb-3 text-sm font-bold text-primary">tools-arab · أدوات عربية مجانية</p>
          <h1 className="max-w-3xl text-3xl font-extrabold leading-snug sm:text-4xl lg:text-5xl">
            أدوات مجانية 100% - تعمل على جهازك وتحافظ على خصوصيتك
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            ضغط صور، تحويل صيغ، ملفات PDF، رموز QR والمزيد — من متصفحك مباشرة دون رفع أي ملف إلى
            خوادمنا.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="#tools"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground shadow hover:bg-primary/90"
            >
              استعرض الأدوات
            </Link>
            <Link
              href="/tools/image-compressor"
              className="inline-flex h-11 items-center justify-center rounded-md border bg-card px-6 text-sm font-bold shadow-sm hover:bg-secondary"
            >
              جرّب ضغط الصور الآن
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-3">
        {highlights.map((item) => (
          <div key={item.title} className="rounded-xl border bg-card p-5 shadow-sm">
            <item.icon className="mb-3 h-6 w-6 text-primary" aria-hidden />
            <h2 className="font-bold">{item.title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </section>

      <section id="tools" className="mx-auto max-w-6xl px-4 pb-14">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold">كل الأدوات</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            ابدأ بأداة ضغط الصور الجاهزة الآن، وباقي الأدوات في الطريق على نفس الأساس الآمن.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>
    </div>
  );
}
