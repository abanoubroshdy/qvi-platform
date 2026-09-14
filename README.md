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

## Routes

- `/` platform homepage (products + free tools)
- `/products/qv1` QV1 waitlist landing
- `/products/neyora` Neyora lab (also `/lab`)
- `/tools/image-compressor` Image Compressor
- `/tools/webp-to-jpg` WEBP to JPG
- `/tools/png-to-pdf` PNG to PDF
- `/tools/qr-generator` QR Generator
- `/tools/color-picker` Color picker (HEX / RGB / HSL)
- `/tools/qr-reader` QR reader from image (no camera)
- `/tools/password-generator` Password generator
- `/tools/base64` Base64 encode / decode
- `/tools/image-resizer` Image resizer
- `/tools/word-counter` Word and character counter
- `/about` · `/privacy-policy` · `/contact` · `/terms`

Free tools stay 100% client-side. Waitlist emails are stored in `localStorage` until a backend is connected.

The header lets you switch **English / Arabic** (RTL) and **Light / Dark / System** appearance. Colors follow the QVI logo: cream paper, navy wordmark, teal-to-violet wave.

## Stack

Next.js 14 App Router, TypeScript, Tailwind CSS, ESLint, shadcn/ui, lucide-react, browser-image-compression, pdf-lib, qrcode, jsqr.
