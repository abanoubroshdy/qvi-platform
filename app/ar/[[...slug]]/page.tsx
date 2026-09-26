import type { Metadata } from "next";
import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { Qv1EvaluationView } from "@/components/qv1/Qv1EvaluationView";
import { Qv1ModelsView } from "@/components/qv1/Qv1ModelsView";
import { StudioSessionProvider } from "@/components/studio/StudioSessionProvider";
import { QviStudioApp } from "@/components/studio/QviStudioApp";
import { AboutView, ContactView, PrivacyView, TermsView } from "@/components/views/LegalViews";
import { HomeView } from "@/components/views/HomeView";
import { LiveToolView } from "@/components/views/LiveToolView";
import { NeyoraView } from "@/components/views/NeyoraView";
import { Qv1View } from "@/components/views/Qv1View";
import { ToolCategoryView } from "@/components/views/ToolCategoryView";
import { ToolsHubView } from "@/components/views/ToolsHubView";
import { UpcomingToolView } from "@/components/views/UpcomingToolView";
import { LoginView } from "@/components/auth/LoginView";
import { AccountView } from "@/components/auth/AccountView";
import type { LiveToolSlug } from "@/lib/i18n";
import { isIndexableLocalizedPath, isLocalizedRoute } from "@/lib/i18n/locale-path";
import { arabicSeoForPath } from "@/lib/page-meta-ar";
import type { Qv1DownloadNotice } from "@/lib/qv1-release";
import { safeNextPath } from "@/lib/safe-next-path";
import {
  aboutPageJsonLd,
  buildArabicPageMetadata,
  contactPageJsonLd,
  homePageJsonLd,
  neyoraPageJsonLd,
  qv1PageJsonLd,
} from "@/lib/seo";
import { getToolBySlug, isToolCategory } from "@/lib/tools";

type PageProps = {
  params: { slug?: string[] };
  searchParams?: { download?: string | string[]; mode?: string; next?: string };
};

function loadTool(loader: () => Promise<{ default?: ComponentType; [key: string]: ComponentType | undefined }>, name: string) {
  return dynamic(async () => {
    const mod = await loader();
    const component = mod[name];
    if (!component) throw new Error(`Missing tool component ${name}`);
    return component;
  });
}

const liveTools: Record<LiveToolSlug, ComponentType> = {
  "mp4-to-mp3": loadTool(() => import("@/components/tools/Mp4ToMp3"), "Mp4ToMp3"),
  "video-converter": loadTool(() => import("@/components/tools/VideoConverter"), "VideoConverter"),
  "mp3-to-wav": loadTool(() => import("@/components/tools/Mp3ToWav"), "Mp3ToWav"),
  "audio-cutter": loadTool(() => import("@/components/tools/AudioCutter"), "AudioCutter"),
  "tempo-pitch": loadTool(() => import("@/components/tools/TempoPitch"), "TempoPitch"),
  "image-compressor": loadTool(() => import("@/components/tools/ImageCompressor"), "ImageCompressor"),
  "webp-to-jpg": loadTool(() => import("@/components/tools/WebpToJpg"), "WebpToJpg"),
  "image-resizer": loadTool(() => import("@/components/tools/ImageResizer"), "ImageResizer"),
  "color-picker": loadTool(() => import("@/components/tools/ColorPicker"), "ColorPicker"),
  "png-to-pdf": loadTool(() => import("@/components/tools/PngToPdf"), "PngToPdf"),
  "pdf-compressor": loadTool(() => import("@/components/tools/PdfCompressor"), "PdfCompressor"),
  "pdf-merger": loadTool(() => import("@/components/tools/PdfMerger"), "PdfMerger"),
  "pdf-to-word": loadTool(() => import("@/components/tools/PdfToWord"), "PdfToWord"),
  "word-counter": loadTool(() => import("@/components/tools/WordCounter"), "WordCounter"),
  base64: loadTool(() => import("@/components/tools/Base64Tool"), "Base64Tool"),
  "qr-generator": loadTool(() => import("@/components/tools/QrGenerator"), "QrGenerator"),
  "qr-reader": loadTool(() => import("@/components/tools/QrReader"), "QrReader"),
  "password-generator": loadTool(() => import("@/components/tools/PasswordGenerator"), "PasswordGenerator"),
};

function englishPathFrom(slug?: string[]) {
  if (!slug || slug.length === 0) return "/";
  return `/${slug.join("/")}`;
}

function noticeFrom(flag: string | string[] | undefined): Qv1DownloadNotice {
  const value = Array.isArray(flag) ? flag[0] : flag;
  if (value === "soon" || value === "limited" || value === "unavailable") return value;
  return "ready";
}

export function generateMetadata({ params }: PageProps): Metadata {
  const englishPath = englishPathFrom(params.slug);
  const seo = arabicSeoForPath(englishPath);
  if (!seo || !isLocalizedRoute(englishPath)) {
    return {
      title: { absolute: "الصفحة غير موجودة | QVI" },
      description: "هذه الصفحة غير موجودة على QVI.",
      robots: { index: false, follow: false },
    };
  }

  return buildArabicPageMetadata({
    title: seo.title,
    description: seo.description,
    englishPath,
    indexable: isIndexableLocalizedPath(englishPath),
  });
}

function ArabicBody({ englishPath, searchParams }: { englishPath: string; searchParams?: PageProps["searchParams"] }) {
  switch (englishPath) {
    case "/":
      return (
        <>
          <JsonLd data={homePageJsonLd("ar")} />
          <HomeView />
        </>
      );
    case "/products/qv1":
      return (
        <>
          <JsonLd data={qv1PageJsonLd("ar")} />
          <Qv1View />
        </>
      );
    case "/products/neyora":
      return (
        <>
          <JsonLd data={neyoraPageJsonLd("ar")} />
          <NeyoraView />
        </>
      );
    case "/studio":
      return (
        <StudioSessionProvider>
          <QviStudioApp />
        </StudioSessionProvider>
      );
    case "/tools":
      return <ToolsHubView />;
    case "/qv1":
      return <Qv1EvaluationView notice={noticeFrom(searchParams?.download)} />;
    case "/qv1/models":
      return <Qv1ModelsView />;
    case "/about":
      return (
        <>
          <JsonLd data={aboutPageJsonLd("ar")} />
          <AboutView />
        </>
      );
    case "/contact":
      return (
        <>
          <JsonLd data={contactPageJsonLd("ar")} />
          <ContactView />
        </>
      );
    case "/privacy-policy":
      return <PrivacyView />;
    case "/terms":
      return <TermsView />;
    case "/login":
      return (
        <LoginView
          initialMode={searchParams?.mode === "signup" ? "signup" : "signin"}
          nextPath={safeNextPath(searchParams?.next)}
        />
      );
    case "/account":
      return <AccountView />;
    default: {
      if (!englishPath.startsWith("/tools/")) return null;
      const slug = englishPath.slice("/tools/".length);
      if (!slug || slug.includes("/")) return null;
      if (isToolCategory(slug)) return <ToolCategoryView category={slug} />;
      if (slug in liveTools) {
        const Tool = liveTools[slug as LiveToolSlug];
        return (
          <LiveToolView slug={slug as LiveToolSlug}>
            <Tool />
          </LiveToolView>
        );
      }
      if (getToolBySlug(slug)) return <UpcomingToolView slug={slug} />;
      return null;
    }
  }
}

export default function ArabicPage({ params, searchParams }: PageProps) {
  const englishPath = englishPathFrom(params.slug);
  if (!isLocalizedRoute(englishPath)) notFound();
  const body = ArabicBody({ englishPath, searchParams });
  if (!body) notFound();
  return body;
}
