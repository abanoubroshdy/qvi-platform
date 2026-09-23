"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { ProfileFields, type ProfileFormValues } from "@/components/auth/ProfileFields";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchProfile, fieldsFromUserMetadata, saveProfile } from "@/lib/supabase/profile";
import { Button } from "@/components/ui/button";
import {
  isProfileComplete,
  isValidFullName,
  recordToFields,
  validateProfile,
  type ProfileIssue,
  type ProfileRecord,
} from "@/lib/auth/profile";
import { countryDisplayName, isCountryCode } from "@/lib/geo/countries";

function toFormValues(fields: ReturnType<typeof recordToFields>): ProfileFormValues {
  return {
    fullName: fields.fullName,
    country: fields.country,
  };
}

export function AccountView() {
  const { user, loading, signOut, refresh } = useAuth();
  const { copy, locale } = useI18n();
  const router = useRouter();
  const a = copy.auth;

  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [form, setForm] = useState<ProfileFormValues>({
    fullName: "",
    country: "",
  });
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"loading" | "idle" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [touched, setTouched] = useState(false);

  const issueCopy = useMemo<Record<ProfileIssue, string>>(
    () => ({
      email: a.invalidEmail,
      password: a.shortPassword,
      passwordMismatch: a.passwordMismatch,
      fullName: a.invalidName,
      country: a.invalidCountry,
      ageConfirm: a.ageRequired,
      privacyConsent: a.privacyRequired,
    }),
    [a],
  );

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let active = true;

    async function load() {
      const supabase = getSupabaseClient();
      const fromMeta = fieldsFromUserMetadata(currentUser.user_metadata);
      if (!supabase) {
        if (!active) return;
        setForm(toFormValues(fromMeta));
        setEditing(!isProfileComplete(fromMeta));
        setStatus("idle");
        return;
      }

      const { profile: row } = await fetchProfile(supabase, currentUser.id);
      if (!active) return;
      const fields = row ? recordToFields(row) : fromMeta;
      setProfile(row);
      setForm(toFormValues(fields));
      setEditing(!isProfileComplete(fields));
      setStatus("idle");
    }

    void load();
    return () => {
      active = false;
    };
  }, [user]);

  const complete = isProfileComplete({
    fullName: form.fullName,
    country: form.country,
  });

  const fieldErrors = touched
    ? {
        fullName: isValidFullName(form.fullName) ? undefined : issueCopy.fullName,
        country: isCountryCode(form.country) ? undefined : issueCopy.country,
      }
    : {};

  if (loading || !user || status === "loading") {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-4">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {a.loading}
        </p>
      </section>
    );
  }

  const createdAt = user.created_at ? new Date(user.created_at) : null;

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setTouched(true);

    const fields = {
      fullName: form.fullName,
      country: form.country,
    };
    const issue = validateProfile(fields);
    if (issue) {
      setError(issueCopy[issue]);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase || !user) {
      setError(a.notConfigured);
      return;
    }

    setStatus("saving");
    const { error: saveError } = await saveProfile(supabase, user.id, fields);
    setStatus("idle");
    if (saveError) {
      setError(saveError);
      return;
    }
    setProfile({
      id: user.id,
      full_name: fields.fullName.trim(),
      country: fields.country,
      gender: profile?.gender ?? null,
      date_of_birth: profile?.date_of_birth ?? null,
      phone: profile?.phone ?? null,
      age_confirmed: profile?.age_confirmed ?? null,
    });
    setEditing(false);
    setSaved(true);
    setTouched(false);
    await refresh();
  }

  return (
    <section className="mx-auto max-w-lg px-4 py-16">
      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">{a.accountTitle}</h1>

        {!complete && !editing ? (
          <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm" role="status">
            {a.incompleteProfile}
          </p>
        ) : null}

        <dl className="space-y-4">
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{a.signedInAs}</dt>
            <dd className="break-all text-base font-medium">{user.email}</dd>
          </div>
          {createdAt ? (
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{a.memberSince}</dt>
              <dd className="text-base font-medium">
                {createdAt.toLocaleDateString(locale === "ar" ? "ar" : undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
          ) : null}
        </dl>

        {editing ? (
          <form onSubmit={onSave} noValidate className="space-y-4 border-t border-border pt-4">
            <p className="text-sm font-semibold">{complete ? a.editProfile : a.completeProfileTitle}</p>
            {!complete ? <p className="text-sm text-muted-foreground">{a.incompleteProfile}</p> : null}
            <ProfileFields
              idPrefix="account"
              values={form}
              errors={fieldErrors}
              disabled={status === "saving"}
              onBlurField={() => setTouched(true)}
              onChange={(patch) => {
                setForm((current) => ({ ...current, ...patch }));
                setError(null);
                setSaved(false);
              }}
            />
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" className="flex-1" disabled={status === "saving"}>
                {status === "saving" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {a.working}
                  </>
                ) : (
                  a.saveProfile
                )}
              </Button>
              {complete ? (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                    setTouched(false);
                    setForm(
                      toFormValues(
                        profile ? recordToFields(profile) : fieldsFromUserMetadata(user.user_metadata),
                      ),
                    );
                  }}
                >
                  {a.cancelEdit}
                </Button>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-sm font-semibold">{a.profileSection}</p>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{a.fullNameLabel}</dt>
                <dd className="text-base font-medium">{form.fullName || "—"}</dd>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{a.countryLabel}</dt>
                <dd className="text-base font-medium">
                  {form.country ? countryDisplayName(form.country, locale) : "—"}
                </dd>
              </div>
            </dl>
            {saved ? (
              <p className="text-sm text-primary" role="status">
                {a.profileSaved}
              </p>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
              {a.editProfile}
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" className="flex-1" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" aria-hidden />
            {a.signOut}
          </Button>
          <Button asChild variant="secondary" className="flex-1">
            <Link href="/">{a.backHome}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
