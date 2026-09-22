import { StudioSessionProvider } from "@/components/studio/StudioSessionProvider";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <StudioSessionProvider>{children}</StudioSessionProvider>;
}
