import type { SupabaseClient } from "@supabase/supabase-js";
import { toAuthMetadata, toProfileRow, type ProfileFields, type ProfileRecord } from "@/lib/auth/profile";

export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ profile: ProfileRecord | null; error: string | null }> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) return { profile: null, error: error.message };
  return { profile: (data as ProfileRecord | null) ?? null, error: null };
}

export async function saveProfile(
  supabase: SupabaseClient,
  userId: string,
  fields: ProfileFields,
): Promise<{ error: string | null }> {
  const row = toProfileRow(userId, fields);
  const { error: upsertError } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
  if (upsertError) return { error: upsertError.message };

  const meta = toAuthMetadata(fields);
  const data: Record<string, unknown> = {
    full_name: meta.full_name,
    country: meta.country,
  };
  if (fields.ageConfirmed !== undefined) data.age_confirmed = meta.age_confirmed;
  if (fields.privacyConsent !== undefined) data.privacy_consent = meta.privacy_consent;
  if (fields.marketingConsent !== undefined) data.marketing_consent = meta.marketing_consent;

  const { error: metaError } = await supabase.auth.updateUser({ data });
  if (metaError) return { error: metaError.message };
  return { error: null };
}

export function fieldsFromUserMetadata(metadata: Record<string, unknown> | undefined): ProfileFields {
  return {
    fullName: typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "",
    country: typeof metadata?.country === "string" ? metadata.country : "",
    ageConfirmed: metadata?.age_confirmed === true,
    privacyConsent: metadata?.privacy_consent === true,
    marketingConsent: metadata?.marketing_consent === true,
  };
}

/** Persist profile row + auth metadata after email confirmation (OTP or legacy link). */
export async function completeSignupProfileAfterConfirm(
  supabase: SupabaseClient,
  userId: string,
  metadata: Record<string, unknown> | undefined,
): Promise<{ error: string | null }> {
  return saveProfile(supabase, userId, fieldsFromUserMetadata(metadata));
}
