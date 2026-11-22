import { AdminUsersView } from "@/components/admin/AdminUsersView";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin users",
  description: "Manage QVI user accounts.",
  path: "/admin/users",
});

export default function AdminUsersPage() {
  return <AdminUsersView />;
}