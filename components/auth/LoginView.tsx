"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthForm } from "@/components/auth/AuthForm";

export function LoginView({ initialMode = "signin" }: { initialMode?: "signin" | "signup" }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/account");
    }
  }, [loading, user, router]);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16">
      <AuthForm initialMode={initialMode} />
    </section>
  );
}
