import { ForgotPasswordView } from "@/components/auth/ForgotPasswordView";
import { buildPageMetadata } from "@/lib/seo";

const pageTitle = "Forgot password";
const pageDescription = "Request a link to reset your QVI account password.";

export const metadata = {
  ...buildPageMetadata({
    title: pageTitle,
    description: pageDescription,
    path: "/forgot-password",
  }),
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
