"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { GENDERS, dobInputBounds, type Gender, type ProfileIssue } from "@/lib/auth/profile";
import { callingCodeForCountry, sortedCountries } from "@/lib/geo/countries";
import { cn } from "@/lib/utils";

export type ProfileFormValues = {
  fullName: string;
  gender: string;
  country: string;
  dateOfBirth: string;
  nationalPhone: string;
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
  const bounds = useMemo(() => dobInputBounds(), []);
  const callingCode = callingCodeForCountry(values.country);
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
          onBlur={() => onBlurField?.("fullName")}
          onChange={(event) => onChange({ fullName: event.target.value })}
          className={inputClass}
        />
        <FieldError id={`${idPrefix}-name-error`} message={errors?.fullName} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-gender`} className="text-sm font-semibold">
            {a.genderLabel}
            {required ? <span className="ms-1 text-destructive">*</span> : null}
          </Label>
          <NativeSelect
            id={`${idPrefix}-gender`}
            name="gender"
            required={required}
            value={values.gender}
            disabled={disabled}
            aria-invalid={Boolean(errors?.gender)}
            onBlur={() => onBlurField?.("gender")}
            onChange={(event) => onChange({ gender: event.target.value })}
            className={cn(inputClass, "bg-background")}
          >
            <option value="">{a.genderPlaceholder}</option>
            {GENDERS.map((gender: Gender) => (
              <option key={gender} value={gender}>
                {a.genders[gender]}
              </option>
            ))}
          </NativeSelect>
          <FieldError id={`${idPrefix}-gender-error`} message={errors?.gender} />
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
            onBlur={() => onBlurField?.("country")}
            onChange={(event) => onChange({ country: event.target.value, nationalPhone: values.nationalPhone })}
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

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-dob`} className="text-sm font-semibold">
          {a.dobLabel}
          {required ? <span className="ms-1 text-destructive">*</span> : null}
        </Label>
        <Input
          id={`${idPrefix}-dob`}
          name="dateOfBirth"
          type="date"
          required={required}
          autoComplete="bday"
          min={bounds.min}
          max={bounds.max}
          value={values.dateOfBirth}
          disabled={disabled}
          aria-invalid={Boolean(errors?.dateOfBirth || errors?.tooYoung || errors?.tooOld)}
          onBlur={() => onBlurField?.("dateOfBirth")}
          onChange={(event) => onChange({ dateOfBirth: event.target.value })}
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">{a.dobHint}</p>
        <FieldError
          id={`${idPrefix}-dob-error`}
          message={errors?.dateOfBirth || errors?.tooYoung || errors?.tooOld}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-phone`} className="text-sm font-semibold">
          {a.phoneLabel}
          {required ? <span className="ms-1 text-destructive">*</span> : null}
        </Label>
        <div className="flex gap-2" dir="ltr">
          <span
            className="inline-flex h-11 shrink-0 items-center rounded-md border border-input bg-muted/50 px-3 text-sm font-medium text-foreground"
            aria-hidden
          >
            {callingCode ? `+${callingCode}` : "—"}
          </span>
          <Input
            id={`${idPrefix}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            required={required}
            placeholder={a.phonePlaceholder}
            value={values.nationalPhone}
            disabled={disabled}
            aria-invalid={Boolean(errors?.nationalPhone || errors?.phone)}
            onBlur={() => onBlurField?.("nationalPhone")}
            onChange={(event) => onChange({ nationalPhone: event.target.value })}
            className={cn(inputClass, "min-w-0 flex-1")}
          />
        </div>
        <p className="text-xs text-muted-foreground">{a.phoneHint}</p>
        <FieldError id={`${idPrefix}-phone-error`} message={errors?.nationalPhone || errors?.phone} />
      </div>
    </div>
  );
}
