import type { Metadata } from "next";
import { TermsView } from "@/components/views/LegalViews";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for the QVI platform, products, and free browser tools.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <TermsView />;
}
