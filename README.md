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

V1 scope is defined in `lib/studio/definition.ts` (phase 0). The session model is `lib/studio/project.ts` (phase 1). Phase 2 plays that session with Web Audio and renders tempo and pitch offline. Phase 3 is the multitrack interface. Phase 4 hosts that same in-memory session on `/` and `/studio`. Refresh clears it. Phase 5 bounces the audible mix to MP3 or WAV with ffmpeg.wasm. Phase 6 keeps phones responsive: the playhead moves without redrawing every track, clip drags commit on release, waveforms stay within the screen's pixels, and tempo previews run one track at a time. Phase 7 locks those v1 rules in an acceptance test: a clip drag on a phone does not open the track sheet, notices and overlays dismiss, and removing the last clip removes its track. Stem separation stays on QV1, synthesis stays on Neyora, and the studio is not a `/tools` utility.

## Routes

- `/` QVI Studio session, with links to QV1, Neyora, and free tools
- `/studio` the same QVI Studio session at its dedicated URL
- `/products/qv1` QV1 waitlist landing
- `/products/neyora` Neyora lab (also `/lab`)
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
- `/tools/mp4-to-mp3` Extract audio from video (MP3, WAV, M4A, OGG, FLAC) with sample rate, bitrate or bit depth, and quality. Runs in the browser via ffmpeg.wasm; files over ~80 MB may fail because the whole video is loaded into memory.
- `/tools/mp3-to-wav` Convert MP3/M4A/OGG to WAV
- `/tools/audio-cutter` Trim audio
- `/login` sign in or create an account (name, gender, country, date of birth, phone)
- `/account` signed-in profile
- `/about` · `/privacy-policy` · `/contact` · `/terms`

Free tools stay 100% client-side. Waitlist emails are stored in Supabase (`waitlist_signups`) when the backend is configured, otherwise in `localStorage`. New accounts collect name, gender, country, date of birth, and phone and save them on `profiles`.

The header lets you switch **English / Arabic** (RTL) and **Light / Dark / System** appearance. Colors follow the QVI logo: cream paper, navy wordmark, teal-to-violet wave.

## Stack

Next.js 14 App Router, TypeScript, Tailwind CSS, ESLint, shadcn/ui, lucide-react, Supabase Auth, browser-image-compression, pdf-lib, pdfjs-dist, docx, qrcode, jsqr, ffmpeg.wasm.
