# Site admin dashboard (server APIs)

The admin dashboard APIs live under `/api/admin/*` and require a signed-in user whose email is listed in `ADMIN_EMAILS` (or, if unset, `LICENSE_ADMIN_EMAILS` for backwards compatibility).

Apply **`supabase/migrations/0008_admin_dashboard.sql`** after the licensing migrations. It adds `contact_submissions`, waitlist handling columns, `service_role` grants, and the `admin_dashboard_stats` / `admin_search_users` RPCs.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `ADMIN_EMAILS` | Comma-separated emails allowed to use site admin APIs (preferred). |
| `LICENSE_ADMIN_EMAILS` | Fallback admin list when `ADMIN_EMAILS` is unset; still used for license-only tooling. |
| `SUPABASE_SECRET_KEY` | Service role key for all admin routes. |
| `CF_ANALYTICS_API_TOKEN` | Cloudflare API token with Web Analytics read access (optional; `/api/admin/traffic`). |
| `CF_ACCOUNT_ID` | Cloudflare account ID for GraphQL analytics. |
| `CF_WEB_ANALYTICS_SITE_TAG` | Web Analytics site tag for the production site. |
| `NEXT_PUBLIC_CF_BEACON_TOKEN` | Cloudflare Web Analytics **browser beacon** token (see below). |

getqvi.com is served on **Vercel** with **Cloudflare DNS-only** (not proxied). Page views only appear in Cloudflare when the **beacon script** is on the site. When `NEXT_PUBLIC_CF_BEACON_TOKEN` is set, the root layout loads `https://static.cloudflareinsights.com/beacon.min.js` via `next/script` (`afterInteractive`). The beacon is cookieless and does not use the signup marketing consent checkbox.

The `/api/admin/traffic` route uses the GraphQL API (`CF_ANALYTICS_*` vars) and complements the beacon; configure both for admin charts plus Cloudflare dashboard data.

If you add a Content-Security-Policy, allow `script-src https://static.cloudflareinsights.com` and `connect-src https://cloudflareinsights.com` (and subdomains as needed).

Contact form submissions are emailed through Resend **and** persisted to `contact_submissions` when the service role is configured.

## HTTP API (selected)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/admin/overview` | Aggregated stats via `admin_dashboard_stats`. |
| GET | `/api/admin/users` | Search users (`q`, `limit`, `offset`). |
| GET | `/api/admin/users/[id]` | User profile, licenses, download count. |
| POST | `/api/admin/users/[id]/ban` | Supabase auth ban. |
| POST | `/api/admin/users/[id]/unban` | Lift ban. |
| GET/PATCH | `/api/admin/contact`, `/api/admin/waitlist` | Inbox lists and mark handled. |
| GET | `/api/admin/inbox/export?type=contact\|waitlist` | CSV export. |
| GET | `/api/admin/traffic` | Cloudflare Web Analytics visits (7d default). |
| PATCH/DELETE | `/api/admin/releases/[id]` | Release CRUD completion. |

Existing licensing admin routes under `/api/admin/licenses` and `/api/admin/releases` share the same `requireSiteAdmin` guard.