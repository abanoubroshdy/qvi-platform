import { LicenseAdminView } from "@/components/admin/LicenseAdminView";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = {
  ...buildPageMetadata({
    title: "License admin",
    description: "Manage QVI product licenses.",
    path: "/admin/licenses",
  }),
  robots: { index: false, follow: false },
};

export default function LicenseAdminPage() {
  return <LicenseAdminView />;
}