import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
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
  themeColor: "#041016",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="min-h-screen font-sans">
        {/* Static public CSS so phones on tunnels still get a usable layout if Next CSS is blocked. */}
        <link rel="stylesheet" href="/brand.css?v=2" />
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html,body{margin:0;background:#05070d;color:#f8fafc}a{color:#67e8f9;text-decoration:none}",
          }}
        />
        <div className="qvi-shell flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
