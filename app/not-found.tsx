import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page does not exist on QVI.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Page not found | QVI",
    description: "This page does not exist on QVI.",
  },
  twitter: {
    card: "summary",
    title: "Page not found | QVI",
    description: "This page does not exist on QVI.",
  },
};

export default function NotFound() {
  return <NotFoundView />;
}
