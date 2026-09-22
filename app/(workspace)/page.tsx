import type { Metadata } from "next";
import { HomeView } from "@/components/views/HomeView";

const title = "QVI Studio | Quality Virtual Instruments";
const description =
  "Mix tracks in QVI Studio on this device. Set volume, tempo, and pitch, then open QV1, Neyora, and the free browser tools.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "/",
  },
};

export default function HomePage() {
  return <HomeView />;
}
