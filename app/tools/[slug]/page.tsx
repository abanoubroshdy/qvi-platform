import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UpcomingToolView } from "@/components/views/UpcomingToolView";
import { getToolBySlug, tools } from "@/lib/tools";

type PageProps = {
  params: { slug: string };
};

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.filter((tool) => !tool.available).map((tool) => ({ slug: tool.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const tool = getToolBySlug(params.slug);
  if (!tool) {
    return { title: "Tool not found" };
  }

  return {
    title: `${tool.title} | Coming soon`,
    description: tool.description,
    alternates: { canonical: tool.href },
  };
}

export default function UpcomingToolPage({ params }: PageProps) {
  const tool = getToolBySlug(params.slug);
  if (!tool) notFound();

  return <UpcomingToolView slug={params.slug} />;
}
