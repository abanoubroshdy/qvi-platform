# QVI - Quality Virtual Instruments

Official platform for the QVI audio software ecosystem: **QV1** (stem separation & processing), **Neyora** (DDSP instrument synthesis), and free browser utilities that run entirely on-device.

Tagline: *The Future of Intelligent Audio.*

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For a production preview that works better on phones:

```bash
npm run build
npx next start -p 43123 -H 0.0.0.0
```

Production:

```bash
npm run build
npm start
```

Optional: copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` before deploy.

## QV1 Evaluation download

`/qv1` is the public page for **QV1 Evaluation** (Windows). `/qv1/models` lists third-party model sources and licenses. A signed-in request to `/qv1/download` records a row in `qv1_downloads` and redirects with HTTP 307 to the public Setup URL on `downloads.getqvi.com`. The account page lists that history. Set `QV1_DOWNLOAD_ENABLED` in `lib/qv1-download.ts` to false to pause the file URL without taking the page down.

The Setup is a single Windows download of about 170 MB (`QV1-Setup-Evaluation.exe`). During install it detects the GPU and fetches components from `https://getqvi.com/downloads/evaluation/` (about 675 MB for the core, more for NVIDIA CUDA). That path is a public temporary redirect to `https://downloads.getqvi.com/qv1/`. It is not behind sign-in. Do not add an auth middleware matcher that includes `/downloads`.

Optional server-only R2 credentials (`R2_*`, `QV1_OBJECT_KEY`) are still read for configuration checks; the live route redirects to the public custom domain and does not presign through the Worker. Set them in **Vercel → Project Settings → Environment Variables** (Production and Preview) if you need the legacy “coming soon” path when credentials are missing. Do not prefix them with `NEXT_PUBLIC_` and do not commit real values.

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET` — `qv1-downloads`
- `QV1_OBJECT_KEY` — optional. Defaults to `qv1/QV1-Setup-Evaluation.exe`.

`QV1_DOWNLOAD_URL` is retired. Do not set it.

Run `supabase/migrations/0005_qv1_downloads.sql` in the Supabase SQL editor so the history table and row-level security exist, then redeploy. Version, file name, size, SHA256, and code-signing state live in `lib/qv1-release.ts`. Ads stay on `/tools` only; `/qv1` and `/qv1/models` do not render ad units.

## Contact form (Vercel)

`/contact` posts to `/api/contact` and emails **support@getqvi.com** via [Resend](https://resend.com). In **Vercel → Environment Variables** (Production + Preview), set:

- `RESEND_API_KEY`
- `CONTACT_FROM_EMAIL` — e.g. `QVI Contact <noreply@getqvi.com>` (domain must be verified in Resend)
- `CONTACT_TO_EMAIL` — optional; defaults to `support@getqvi.com`

Redeploy after adding variables.

## Authentication (Vercel)

Sign-in uses Supabase. On [getqvi.com](https://getqvi.com), set these in **Vercel → Project Settings → Environment Variables** (Production + Preview), then **Redeploy**:

- `NEXT_PUBLIC_SUPABASE_URL` — `https://<project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the anon/publishable key from Supabase → **Project Settings → API**
- `NEXT_PUBLIC_SITE_URL` — the public site origin, `https://getqvi.com` (not the Supabase URL)

Then in Supabase → **Authentication → URL Configuration**, add:

- Site URL: `https://getqvi.com`
- Redirect URLs: `https://getqvi.com/**`, `https://getqvi.com/auth/callback`, and the Vercel preview origin if needed

Do not put the Supabase project URL in `NEXT_PUBLIC_SITE_URL`.

## QVI Studio

V1 scope is defined in `lib/studio/definition.ts`. The in-memory session lives only on `/studio`. Refresh clears it. The homepage and header link to that page. Files stay on the device. Stem separation stays on QV1, synthesis stays on Neyora, and the studio is not a `/tools` utility.

## Routes

- `/` product home, with links to QVI Studio, QV1, Neyora, and free tools
- `/studio` the QVI Studio session
- `/qv1` QV1 Evaluation (Windows). Signed-in Setup download, about 170 MB
- `/qv1/models` third-party model sources and licenses
- `/qv1/download` records the download and redirects to the public Setup on `downloads.getqvi.com`
- `/downloads/evaluation/:path*` public temporary redirect to `https://downloads.getqvi.com/qv1/:path*`
- `/products/qv1` QV1 product page
- `/products/neyora` Neyora lab (`/lab` permanently redirects here)
- `/tools/image-compressor` Image Compressor
- `/tools/webp-to-jpg` WEBP to JPG
- `/tools/png-to-pdf` PNG to PDF
- `/tools/pdf-compressor` PDF compressor
- `/tools/pdf-merger` PDF merger
- `/tools/pdf-to-word` PDF to Word (client-side, no upload)
- `/tools/qr-generator` QR Generator
- `/tools/color-picker` Color picker (HEX / RGB / HSL)
- `/tools/qr-reader` QR reader from image (no camera)
- `/tools/password-generator` Password generator
- `/tools/base64` Base64 encode / decode
- `/tools/image-resizer` Image resizer
- `/tools/word-counter` Word and character counter
- `/tools/mp4-to-mp3` Batch video to audio (MP3, WAV, FLAC, AAC, M4A, OGG, Opus, AIFF, WMA) with sample rate, channels, and bitrate. Runs in the browser via ffmpeg.wasm. Files over ~80 MB may fail; files over ~250 MB are skipped.
- `/tools/video-converter` Batch video to video (MP4 H.264/AAC, WebM VP9 or VP8/Opus, MKV, MOV, AVI, GIF) with resolution, frame rate, CRF or bitrate, keep/remove audio, and a remux/copy path. Same in-browser memory limits.
- `/tools/mp3-to-wav` Convert any audio format in batch (shared quality + ZIP)
- `/tools/audio-cutter` Trim audio
- `/login` sign in or create an account (name, gender, country, date of birth, phone)
- `/account` signed-in profile and QV1 download history
- `/about` · `/privacy-policy` · `/contact` · `/terms`

Free tools stay 100% client-side. Waitlist emails are stored in Supabase (`waitlist_signups`) when the backend is configured, otherwise in `localStorage`. New accounts collect name, gender, country, date of birth, and phone and save them on `profiles`.

The header lets you switch **English / Arabic** (RTL) and **Light / Dark / System** appearance. Colors follow the QVI logo: cream paper, navy wordmark, teal-to-violet wave.

## Cloudflare Workers (parallel deploy)

Production **getqvi.com** stays on Vercel until you cut over DNS. This repo also builds the same Next.js app as a Cloudflare Worker named **`qvi-platform`** via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) (pinned for Next.js 14). Vercel scripts (`npm run build`, `npm start`) are unchanged.

### Commands

| Script | Purpose |
| --- | --- |
| `npm run build:worker` | `opennextjs-cloudflare build` (after pdf.js asset copy) |
| `npm run preview` | Build and run the Worker locally (`wrangler dev`) |
| `npm run deploy` | Build and `wrangler deploy` (do not point production DNS here until cutover) |
| `npm run upload:worker` | Build and `wrangler versions upload` (preview URL, no route change) |
| `npm run cf-typegen` | Generate `cloudflare-env.d.ts` (gitignored) |

Config: `wrangler.jsonc` (`nodejs_compat`, worker name `qvi-platform`, account `457cb0c1c9f50496c4d4ba36174b69f0`), `open-next.config.ts` (dummy cache; no ISR). Copy `.dev.vars.example` → `.dev.vars` for local preview.

### Environment variables (names only)

Every name the app reads today. Never commit values.

**Build-time (inlined into the client when `NEXT_PUBLIC_*`):**

| Name | Used for |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site origin in metadata and auth redirects |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (alias: `SUPABASE_URL`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key (aliases: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | AdSense publisher id on `/tools` |
| `NEXT_PUBLIC_ADSENSE_SLOT` | Default 300×250 slot |
| `NEXT_PUBLIC_ADSENSE_SLOT_TOP` | Optional top slot |
| `NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM` | Optional bottom slot (ignored if same as top) |

**Runtime (Worker secrets or Vercel env):**

| Name | Used for |
| --- | --- |
| `RESEND_API_KEY` | Contact form → Resend API |
| `CONTACT_FROM_EMAIL` | From address for contact mail |
| `CONTACT_TO_EMAIL` | Inbox (defaults to `support@getqvi.com`) |
| `R2_ACCOUNT_ID` | QV1 download config (optional; route uses public URL) |
| `R2_ACCESS_KEY_ID` | Same |
| `R2_SECRET_ACCESS_KEY` | Same |
| `R2_BUCKET` | Same |
| `QV1_OBJECT_KEY` | Optional object key override |

**Vercel-only fallbacks (not used on Cloudflare):** `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL` — set `NEXT_PUBLIC_SITE_URL` on Workers instead.

`SUPABASE_SECRET_KEY` appears in `.env.example` but is **not read** by current server code.

### Worker secrets

After `npm run build:worker`, set runtime secrets on the deployed Worker (names only):

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put CONTACT_FROM_EMAIL
# …repeat for each runtime name above
```

Plain vars that must be present at **build** time (especially `NEXT_PUBLIC_SITE_URL` and Supabase public keys) should be exported in the shell before `npm run build:worker`, or set in CI (see `.github/workflows/cloudflare-worker.yml`).

### Free plan CPU note

Workers **Free** allows about **10 ms CPU per request**. This app uses dynamic SSR (root layout reads headers), Supabase session work on auth routes, and Resend on `/api/contact`. Those paths may hit error **1102** on Free. Measure with `npm run measure:worker -- <url>` and `npx wrangler tail qvi-platform`. Upgrade to Workers Paid (or keep production on Vercel) if SSR/auth consistently exceeds the cap.

### Cutover (when ready)

1. Deploy the Worker: `npm run deploy` with production env at build time (`NEXT_PUBLIC_SITE_URL=https://getqvi.com`, Supabase keys, AdSense vars).
2. Store runtime secrets on the Worker (table above).
3. In Cloudflare → Workers → **qvi-platform** → **Domains & Routes**, attach **Custom Domains** `getqvi.com` and `www.getqvi.com` (proxied orange cloud).
4. Remove or disable the Vercel DNS target for the apex/`www` (grey-cloud CNAME today).
5. Confirm Supabase redirect URLs include `https://getqvi.com/**` and `https://getqvi.com/auth/callback`.
6. Disable or delete the Vercel project only after traffic is stable on the Worker.

Rollback: remove Worker custom domains, restore the Vercel CNAME, leave the Worker deployed but unrouted.

More detail (beta host, CI upload, bundle limits): [docs/cloudflare-migration.md](docs/cloudflare-migration.md).

## Stack

Next.js 14 App Router, TypeScript, Tailwind CSS, ESLint, shadcn/ui, lucide-react, Supabase Auth, browser-image-compression, pdf-lib, pdfjs-dist, docx, qrcode, jsqr, ffmpeg.wasm.
