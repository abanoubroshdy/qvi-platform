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

`/qv1` is the public page for **QV1 Evaluation** (Windows). `/qv1/models` lists third-party model sources and licenses. `/qv1/download` is signed-in only. An anonymous visitor is redirected to `/login?next=/qv1/download`, then returned to the download after sign-in or sign-up.

A signed-in request records a row in `qv1_downloads` and redirects with HTTP 307 to a short-lived (1 hour) presigned GET for the installer in Cloudflare R2. The public download domain is not used. The file is a zip: extract the whole archive into one folder, then run the exe. The `.bin` slices must stay next to the exe. The account page lists that user’s downloads (version, date and time, and a count).

The download control is a normal link, so the browser does a full navigation and can follow the redirect into the file. If any R2 variable below is unset, `/qv1/download` redirects to `/qv1?download=soon` and the page shows an error. A user who hits the hourly cap (8 signed URLs) is sent to `/qv1?download=limited`. A failed history insert is logged and does not block the file.

Set these in **Vercel → Project Settings → Environment Variables** (Production and Preview). They are server-only. Do not prefix them with `NEXT_PUBLIC_` and do not commit real values.

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET` — `qv1-downloads`
- `QV1_OBJECT_KEY` — `qv1/1.2.0/QV1-Setup-Evaluation.zip`

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
- `/qv1` QV1 Evaluation download (Windows)
- `/qv1/models` third-party model sources and licenses
- `/qv1/download` signed-in presigned R2 redirect, or `/qv1?download=soon` when R2 is unset
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

## Stack

Next.js 14 App Router, TypeScript, Tailwind CSS, ESLint, shadcn/ui, lucide-react, Supabase Auth, browser-image-compression, pdf-lib, pdfjs-dist, docx, qrcode, jsqr, ffmpeg.wasm.
