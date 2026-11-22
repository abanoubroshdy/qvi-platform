import { AdminEventsView } from "@/components/admin/AdminEventsView";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin license events",
  description: "License and device audit log.",
  path: "/admin/events",
});

export default function AdminEventsPage() {
  return <AdminEventsView />;
}