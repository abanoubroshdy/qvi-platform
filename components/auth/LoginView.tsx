"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthForm } from "@/components/auth/AuthForm";
import { createQv1AutostartToken, postAuthPath } from "@/lib/qv1-download";

export function LoginView({
  initialMode = "signin",
  nextPath = "/account",
}: {
  initialMode?: "signin" | "signup";
  nextPath?: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const autostartToken = useRef(createQv1AutostartToken());
  const destination = useMemo(
    () => postAuthPath(nextPath, autostartToken.current),
    [nextPath],
  );

  useEffect(() => {
    if (!loading && user) {
      router.replace(destination);
    }
  }, [destination, loading, user, router]);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-12 sm:py-16">
      <AuthForm initialMode={initialMode} nextPath={destination} />
    </section>
  );
}
