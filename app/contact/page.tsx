import type { Metadata } from "next";
import { ContactView } from "@/components/views/LegalViews";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact QVI about QV1, Neyora, waitlists, privacy, or the free tools.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <ContactView />;
}
