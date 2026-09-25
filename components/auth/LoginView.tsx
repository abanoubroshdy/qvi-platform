"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeNextPath } from "@/lib/safe-next-path";

export function LoginView({
  initialMode = "signin",
  nextPath = "/account",
}: {
  initialMode?: "signin" | "signup";
  nextPath?: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const destination = safeNextPath(nextPath);

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
