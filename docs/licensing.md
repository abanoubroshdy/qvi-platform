# Product licensing (getqvi.com)

This stack implements website-side licensing for the Neyora / QV1 desktop clients. The **C# client models** (`LicenseApiClient`, `LicenseApiModels`, `LicenseTokenPayload`, `ProductCodes`) are the API contract.

## Database

Apply migrations in order in the Supabase SQL editor:

1. Existing `supabase/migrations/0001`–`0005`
2. **`supabase/migrations/0006_licensing.sql`**
3. **`supabase/migrations/0007_licensing_security.sql`** (grants licensing tables to `service_role`, revokes public `license_releases` reads, adds atomic `register_license_device`)

`SUPABASE_SECRET_KEY` may be a legacy JWT service key or the newer `sb_secret_*` format; both are supported.

## Environment variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_SECRET_KEY` | Service role key for license API, admin routes, and event logging (never expose to the browser). |
| `LICENSE_SIGNING_PRIVATE_KEY` | RSA private key (PKCS#8 PEM) used to sign license JWTs (`RS256`). |
| `LICENSE_ADMIN_EMAILS` | Comma-separated emails allowed to use `/admin/licenses`. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Short-lived presigned GET URLs for paid artifacts (`/api/downloads/artifact`). |

Public Supabase URL/anon key variables are unchanged.

## RSA keypair

```bash
node scripts/generate-license-signing-key.mjs
```

- Put the **private** PEM in `LICENSE_SIGNING_PRIVATE_KEY` (Vercel accepts multiline secrets or `\n`-escaped one-liners).
- Embed the **public** PEM in the desktop app as `LicenseOptions.LicensePublicKeyPem` (full PEM including `BEGIN PUBLIC KEY` / `END PUBLIC KEY` lines).

## HTTP API (desktop)

Base: `https://getqvi.com/api/license`

| Method | Path | Body / query |
|--------|------|----------------|
| POST | `/activate` | `productCode`, `licenseKey` and/or `accessToken`, `deviceFingerprint`, `deviceName`, `appVersion` |
| POST | `/validate` | `licenseToken`, `deviceFingerprint`, `appVersion` |
| POST | `/deactivate-device` | `licenseToken`, `deviceFingerprint` |
| GET | `/api/updates/check` | `?product=&version=` + optional `Authorization: Bearer <licenseToken>` |

Error codes in JSON: `device_limit`, `revoked`, `expired`, `invalid_key` (plus `invalid_token`, `rate_limit`, etc.).

Update responses use **`downloadUrl`** (not `downloadPath`) per the desktop `UpdateCheckResponse` model.

## QV1 Evaluation downloads

`/qv1/download` is unchanged: signed-in users are redirected to the public Evaluation setup URL and a row is written to `qv1_downloads`.

Paid / release artifacts use `/api/downloads/artifact` after session or license-token checks.

## Admin

Visit `/admin/licenses` while signed in with an email listed in `LICENSE_ADMIN_EMAILS`.