"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { GENDERS, dobInputBounds, type Gender } from "@/lib/auth/profile";
import { callingCodeForCountry, sortedCountries } from "@/lib/geo/countries";

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
  disabled?: boolean;
};

export function ProfileFields({ idPrefix, values, onChange, disabled }: ProfileFieldsProps) {
  const { copy, locale } = useI18n();
  const a = copy.auth;
  const countries = useMemo(() => sortedCountries(locale), [locale]);
  const bounds = useMemo(() => dobInputBounds(), []);
  const callingCode = callingCodeForCountry(values.country);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>{a.fullNameLabel}</Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          autoComplete="name"
          required
          maxLength={80}
          placeholder={a.fullNamePlaceholder}
          value={values.fullName}
          disabled={disabled}
          onChange={(event) => onChange({ fullName: event.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-gender`}>{a.genderLabel}</Label>
          <NativeSelect
            id={`${idPrefix}-gender`}
            name="gender"
            required
            value={values.gender}
            disabled={disabled}
            onChange={(event) => onChange({ gender: event.target.value })}
          >
            <option value="">{a.genderPlaceholder}</option>
            {GENDERS.map((gender: Gender) => (
              <option key={gender} value={gender}>
                {a.genders[gender]}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-country`}>{a.countryLabel}</Label>
          <NativeSelect
            id={`${idPrefix}-country`}
            name="country"
            required
            value={values.country}
            disabled={disabled}
            onChange={(event) => onChange({ country: event.target.value, nationalPhone: values.nationalPhone })}
          >
            <option value="">{a.countryPlaceholder}</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-dob`}>{a.dobLabel}</Label>
        <Input
          id={`${idPrefix}-dob`}
          name="dateOfBirth"
          type="date"
          required
          autoComplete="bday"
          min={bounds.min}
          max={bounds.max}
          value={values.dateOfBirth}
          disabled={disabled}
          onChange={(event) => onChange({ dateOfBirth: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">{a.dobHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-phone`}>{a.phoneLabel}</Label>
        <div className="flex gap-2" dir="ltr">
          <span
            className="inline-flex h-9 shrink-0 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
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
            required
            placeholder={a.phonePlaceholder}
            value={values.nationalPhone}
            disabled={disabled}
            onChange={(event) => onChange({ nationalPhone: event.target.value })}
            className="min-w-0 flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground">{a.phoneHint}</p>
      </div>
    </div>
  );
}
