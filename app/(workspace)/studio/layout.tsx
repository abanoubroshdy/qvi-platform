import { StudioSessionProvider } from "@/components/studio/StudioSessionProvider";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <StudioSessionProvider>{children}</StudioSessionProvider>;
}
