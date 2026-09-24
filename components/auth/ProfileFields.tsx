"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { ProfileIssue } from "@/lib/auth/profile";
import { sortedCountries } from "@/lib/geo/countries";
import { cn } from "@/lib/utils";

export type ProfileFormValues = {
  fullName: string;
  country: string;
};

type ProfileFieldsProps = {
  idPrefix: string;
  values: ProfileFormValues;
  onChange: (patch: Partial<ProfileFormValues>) => void;
  onBlurField?: (field: keyof ProfileFormValues) => void;
  errors?: Partial<Record<keyof ProfileFormValues | ProfileIssue, string>>;
  disabled?: boolean;
  required?: boolean;
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

export function ProfileFields({
  idPrefix,
  values,
  onChange,
  onBlurField,
  errors,
  disabled,
  required = true,
}: ProfileFieldsProps) {
  const { copy, locale } = useI18n();
  const a = copy.auth;
  const countries = useMemo(() => sortedCountries(locale), [locale]);
  const inputClass = "h-11 bg-background text-foreground placeholder:text-muted-foreground/80";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`} className="text-sm font-semibold">
          {a.fullNameLabel}
          {required ? <span className="ms-1 text-destructive">*</span> : null}
        </Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          autoComplete="name"
          required={required}
          maxLength={80}
          placeholder={a.fullNamePlaceholder}
          value={values.fullName}
          disabled={disabled}
          aria-invalid={Boolean(errors?.fullName)}
          aria-describedby={errors?.fullName ? `${idPrefix}-name-error` : undefined}
          onBlur={() => onBlurField?.("fullName")}
          onChange={(event) => onChange({ fullName: event.target.value })}
          className={inputClass}
        />
        <FieldError id={`${idPrefix}-name-error`} message={errors?.fullName} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-country`} className="text-sm font-semibold">
          {a.countryLabel}
          {required ? <span className="ms-1 text-destructive">*</span> : null}
        </Label>
        <NativeSelect
          id={`${idPrefix}-country`}
          name="country"
          required={required}
          value={values.country}
          disabled={disabled}
          aria-invalid={Boolean(errors?.country)}
          aria-describedby={errors?.country ? `${idPrefix}-country-error` : undefined}
          onBlur={() => onBlurField?.("country")}
          onChange={(event) => onChange({ country: event.target.value })}
          className={cn(inputClass, "bg-background")}
        >
          <option value="">{a.countryPlaceholder}</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </NativeSelect>
        <FieldError id={`${idPrefix}-country-error`} message={errors?.country} />
      </div>
    </div>
  );
}
