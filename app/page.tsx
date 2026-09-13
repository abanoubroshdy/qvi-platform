import type { Metadata } from "next";
import { HomeView } from "@/components/views/HomeView";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "QVI - Quality Virtual Instruments | AI Audio Tools & Software",
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomeView />;
}
