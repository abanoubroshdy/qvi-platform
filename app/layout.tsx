import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { adsenseVerificationClient } from "@/lib/adsense";
import { pageMeta } from "@/lib/page-meta";
import { openGraphImage } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import "./globals.css";

/**
 * Type scale: 12 / 14 / 16 / 20 / 24 / 32 / 48, with comfortable line-heights.
 * Headings 600–700, body 400–500.
 * Latin uses Inter. Arabic glyphs fall through to IBM Plex Sans Arabic.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ibm-plex-sans-arabic",
});

const defaultOg = openGraphImage("/");

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: pageMeta.home.title,
    template: "%s | QVI",
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.fullName, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.fullName,
  applicationName: siteConfig.name,
  category: "music",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: siteConfig.fullName,
    title: pageMeta.home.title,
    description: siteConfig.description,
    images: [defaultOg],
  },
  twitter: {
    card: "summary_large_image",
    title: pageMeta.home.title,
    description: siteConfig.description,
    images: [defaultOg.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  other: {
    "google-adsense-account": adsenseVerificationClient(),
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1220" },
  ],
  width: "device-width",
  initialScale: 1,
};

const localeBootScript = `(function(){try{var l=localStorage.getItem("qvi-locale");if(l!=="ar"&&l!=="en"){l=(navigator.language||"").toLowerCase().indexOf("ar")===0?"ar":"en"}var d=document.documentElement;d.lang=l;d.dir=l==="ar"?"rtl":"ltr";d.dataset.locale=l;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${ibmPlexSansArabic.variable}`}>
      <body className="min-h-screen font-sans">
        <script dangerouslySetInnerHTML={{ __html: localeBootScript }} />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/brand.css?v=13" />
        <AppProviders>
          <div className="qvi-shell flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
