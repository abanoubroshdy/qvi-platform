import { AdminTrafficView } from "@/components/admin/AdminTrafficView";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin traffic",
  description: "Site traffic and internal metrics.",
  path: "/admin/traffic",
});

export default function AdminTrafficPage() {
  return <AdminTrafficView />;
}