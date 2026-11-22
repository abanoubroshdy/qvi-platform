"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function useAdminGate(nextPath = "/admin") {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [allowed, setAllowed] = useState<"loading" | "yes" | "no">("loading");

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }, [loading, user, router, nextPath]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function probe() {
      const response = await fetch("/api/admin/overview", { credentials: "include" });
      if (!active) return;
      if (response.status === 403) setAllowed("no");
      else if (response.ok) setAllowed("yes");
      else setAllowed("no");
    }
    void probe();
    return () => {
      active = false;
    };
  }, [user]);

  return {
    user,
    authLoading: loading,
    allowed,
    busy: loading || allowed === "loading",
  };
}