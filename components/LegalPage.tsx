import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  updatedAt: string;
  children: ReactNode;
};

export function LegalPage({ title, updatedAt, children }: LegalPageProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-8 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-semibold leading-snug sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {updatedAt}</p>
      </header>
      <div className="space-y-6 text-sm leading-8 sm:text-base">{children}</div>
    </article>
  );
}
