import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Construction } from "lucide-react";
import { AdPlaceholder } from "@/components/AdPlaceholder";
import { ToolCard } from "@/components/ToolCard";
import { Button } from "@/components/ui/button";
import { getToolBySlug, tools } from "@/lib/tools";

type PageProps = {
  params: { slug: string };
};

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.filter((tool) => tool.slug !== "image-compressor").map((tool) => ({ slug: tool.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const tool = getToolBySlug(params.slug);
  if (!tool) {
    return { title: "الأداة غير موجودة" };
  }

  return {
    title: `${tool.title} | قريباً`,
    description: tool.description,
    alternates: { canonical: tool.href },
  };
}

export default function UpcomingToolPage({ params }: PageProps) {
  const tool = getToolBySlug(params.slug);
  if (!tool) notFound();

  const related = tools.filter((item) => item.slug !== tool.slug).slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <AdPlaceholder position="top" className="mb-6" />
      <div className="rounded-xl border bg-card p-6 text-center shadow-sm sm:p-10">
        <Construction className="mx-auto mb-4 h-10 w-10 text-primary" aria-hidden />
        <p className="text-sm font-bold text-primary">{tool.titleEn}</p>
        <h1 className="mt-2 text-3xl font-extrabold">{tool.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-muted-foreground sm:text-base">
          {tool.description} هذه الأداة قيد التجهيز على نفس الأساس: معالجة محلية، بدون رفع ملفات،
          وتجربة عربية كاملة.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/tools/image-compressor">جرّب ضغط الصور المتاح الآن</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/#tools">العودة إلى كل الأدوات</Link>
          </Button>
        </div>
      </div>
      <AdPlaceholder position="middle" className="my-6" />
      <h2 className="mb-4 text-xl font-extrabold">أدوات أخرى</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {related.map((item) => (
          <ToolCard key={item.slug} tool={item} />
        ))}
      </div>
      <AdPlaceholder position="bottom" className="mt-6" />
    </div>
  );
}
