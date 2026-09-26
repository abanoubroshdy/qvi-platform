"use client";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export function ResetPasswordView() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-12 sm:py-16">
      <ResetPasswordForm />
    </section>
  );
}
