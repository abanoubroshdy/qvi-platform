"use client";

import Link from "next/link";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type ConsentFieldsProps = {
  agreedToPrivacy: boolean;
  agreedToMarketing: boolean;
  privacyError?: string;
  onPrivacyChange: (value: boolean) => void;
  onMarketingChange: (value: boolean) => void;
};

export function ConsentFields({
  agreedToPrivacy,
  agreedToMarketing,
  privacyError,
  onPrivacyChange,
  onMarketingChange,
}: ConsentFieldsProps) {
  const { copy } = useI18n();
  const a = copy.auth;

  return (
    <div className="space-y-3">
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border bg-background/70 p-3 text-sm leading-6",
          privacyError ? "border-destructive/60" : "border-border",
        )}
      >
        <input
          id="signup-privacy"
          type="checkbox"
          required
          aria-required="true"
          checked={agreedToPrivacy}
          onChange={(event) => onPrivacyChange(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-primary"
        />
        <span>
          {a.privacyConsentPrefix}{" "}
          <Link
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {copy.footer.privacy}
          </Link>{" "}
          {a.privacyConsentJoin}{" "}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {copy.footer.terms}
          </Link>
          <span className="ms-1 text-destructive" aria-hidden>
            *
          </span>
        </span>
      </label>
      {privacyError ? (
        <p className="text-xs text-destructive" role="alert">
          {privacyError}
        </p>
      ) : null}

      <Label
        htmlFor="signup-marketing"
        className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/70 p-3 text-sm font-normal leading-6 text-foreground"
      >
        <input
          id="signup-marketing"
          type="checkbox"
          checked={agreedToMarketing}
          onChange={(event) => onMarketingChange(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-primary"
        />
        <span>{a.marketingConsent}</span>
      </Label>
    </div>
  );
}
