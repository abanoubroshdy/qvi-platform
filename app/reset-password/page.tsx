import { ResetPasswordView } from "@/components/auth/ResetPasswordView";
import { buildPageMetadata } from "@/lib/seo";

const pageTitle = "Set a new password";
const pageDescription = "Choose a new password for your QVI account.";

export const metadata = {
  ...buildPageMetadata({
    title: pageTitle,
    description: pageDescription,
    path: "/reset-password",
  }),
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordView />;
}
