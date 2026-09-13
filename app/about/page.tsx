import type { Metadata } from "next";
import { AboutView } from "@/components/views/LegalViews";

export const metadata: Metadata = {
  title: "About",
  description:
    "QVI - Quality Virtual Instruments builds intelligent audio software that runs on your device, plus free local browser utilities.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutView />;
}
