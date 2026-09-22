"use client";

import type { ReactNode } from "react";
import { StudioContext } from "@/components/studio/studio-context";
import { useStudioSession } from "@/components/studio/useStudioSession";

/** One in-memory session for `/` and `/studio`. Refresh clears it. */
export function StudioSessionProvider({ children }: { children: ReactNode }) {
  const session = useStudioSession();
  return <StudioContext.Provider value={session}>{children}</StudioContext.Provider>;
}
