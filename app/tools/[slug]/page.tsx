import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolCategoryView } from "@/components/views/ToolCategoryView";
import { UpcomingToolView } from "@/components/views/UpcomingToolView";
import { en } from "@/lib/i18n/en";
import { buildPageMetadata } from "@/lib/seo";
import { getToolBySlug, isToolCategory, toolCategoryOrder, toolCategoryPath, tools } from "@/lib/tools";

type PageProps = {
  params: { slug: string };
};

export const dynamicParams = false;

export function generateStaticParams() {
  const categories = toolCategoryOrder.map((slug) => ({ slug }));
  const upcoming = tools.filter((tool) => !tool.available).map((tool) => ({ slug: tool.slug }));
  return [...categories, ...upcoming];
}

export function generateMetadata({ params }: PageProps): Metadata {
  if (isToolCategory(params.slug)) {
    const group = en.toolGroups[params.slug];
    return buildPageMetadata({
      title: group.title,
      description: group.lead,
      path: toolCategoryPath(params.slug),
    });
  }

  const tool = getToolBySlug(params.slug);
  if (!tool) {
    return { title: "Tool not found" };
  }

  return buildPageMetadata({
    title: `${tool.title} | Coming soon`,
    description: tool.description,
    path: tool.href,
  });
}

export default function ToolsSlugPage({ params }: PageProps) {
  if (isToolCategory(params.slug)) {
    return <ToolCategoryView category={params.slug} />;
  }

  const tool = getToolBySlug(params.slug);
  if (!tool) notFound();

  return <UpcomingToolView slug={params.slug} />;
}
