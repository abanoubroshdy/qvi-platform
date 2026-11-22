import { AdminOverviewView } from "@/components/admin/AdminOverviewView";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin overview",
  description: "QVI site administration overview.",
  path: "/admin",
});

export default function AdminOverviewPage() {
  return <AdminOverviewView />;
}