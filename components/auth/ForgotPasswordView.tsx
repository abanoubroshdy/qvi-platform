"use client";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export function ForgotPasswordView() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-12 sm:py-16">
      <ForgotPasswordForm />
    </section>
  );
}
