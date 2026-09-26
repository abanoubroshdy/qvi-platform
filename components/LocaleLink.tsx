"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { localizeHref } from "@/lib/i18n/locale-path";

type LocaleLinkProps = ComponentProps<typeof Link>;

/** Same href on English pages. On /ar, internal links stay under /ar. */
export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const { locale } = useI18n();
  const localized = typeof href === "string" ? localizeHref(href, locale) : href;
  return <Link href={localized} {...props} />;
}
