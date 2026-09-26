import { AuthCallback } from "@/components/auth/AuthCallback";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = {
  ...buildPageMetadata({
    title: "Signing in",
    description: "Confirming your QVI account session.",
    path: "/auth/callback",
  }),
  robots: { index: false, follow: false },
};

export default function AuthCallbackPage() {
  return <AuthCallback />;
}
