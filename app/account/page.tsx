import { AccountView } from "@/components/auth/AccountView";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = {
  ...buildPageMetadata({
    title: "Account",
    description: "Manage your QVI account.",
    path: "/account",
  }),
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountView />;
}
