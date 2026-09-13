"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function NotFound() {
  const { copy } = useI18n();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <p className="text-sm font-bold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold">{copy.notFound.title}</h1>
      <p className="mt-3 text-sm leading-8 text-muted-foreground">{copy.notFound.body}</p>
      <Button asChild className="mt-6" size="lg">
        <Link href="/">{copy.notFound.back}</Link>
      </Button>
    </div>
  );
}
