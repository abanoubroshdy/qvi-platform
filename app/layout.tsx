import type { Metadata, Viewport } from "next";
import { Cairo, Outfit } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "QVI - Quality Virtual Instruments | AI Audio Tools & Software",
    template: "%s | QVI",
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.fullName, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.fullName,
  applicationName: siteConfig.name,
  category: "music",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.fullName,
    title: "QVI - Quality Virtual Instruments | AI Audio Tools & Software",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "QVI - Quality Virtual Instruments",
    description: siteConfig.description,
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
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F4EF" },
    { media: "(prefers-color-scheme: dark)", color: "#121C28" },
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
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${cairo.variable}`}>
      <body className="min-h-screen font-sans">
        <script dangerouslySetInnerHTML={{ __html: localeBootScript }} />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/brand.css?v=3" />
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
