import type { Metadata } from "next";
import { LoginView } from "@/components/auth/LoginView";
import { siteConfig } from "@/lib/site";

const pageTitle = "Sign in";
const pageDescription = "Sign in or create your QVI account to manage your waitlist spot.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: `${siteConfig.url}/login`,
    type: "website",
  },
};

export default function LoginPage() {
  return <LoginView />;
}
