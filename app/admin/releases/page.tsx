import { AdminReleasesView } from "@/components/admin/AdminReleasesView";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin releases",
  description: "License release artifacts.",
  path: "/admin/releases",
});

export default function AdminReleasesPage() {
  return <AdminReleasesView />;
}