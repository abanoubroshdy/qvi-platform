"use client";

import { createContext, useContext } from "react";
import type { StudioSession } from "@/components/studio/useStudioSession";

export const StudioContext = createContext<StudioSession | null>(null);

export function useStudio(): StudioSession {
  const session = useContext(StudioContext);
  if (!session) throw new Error("QVI Studio session is missing.");
  return session;
}
