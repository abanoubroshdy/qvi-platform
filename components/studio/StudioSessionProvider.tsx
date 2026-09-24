"use client";

import type { ReactNode } from "react";
import { StudioContext } from "@/components/studio/studio-context";
import { useStudioSession } from "@/components/studio/useStudioSession";

/** Studio session for `/studio`. IndexedDB restores it on this device after refresh. */
export function StudioSessionProvider({ children }: { children: ReactNode }) {
  const session = useStudioSession();
  return <StudioContext.Provider value={session}>{children}</StudioContext.Provider>;
}
