import { AdminInboxView } from "@/components/admin/AdminInboxView";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin inbox",
  description: "Contact and waitlist messages.",
  path: "/admin/inbox",
});

export default function AdminInboxPage() {
  return <AdminInboxView />;
}