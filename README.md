# تولز عرب (tools-arab)

موقع أدوات عربية مجانية تعمل داخل المتصفح. الأساس جاهز مع أربع أدوات مكتملة تعمل محلياً: ضغط الصور، تحويل WEBP إلى JPG، تحويل PNG إلى PDF، ومولد رمز QR.

## المبدأ

الملفات تُعالج على جهاز المستخدم. لا مسارات API لرفع الملفات، ولا معالجة على الخادم لأداة الضغط.

## التشغيل محلياً

```bash
npm install
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000). للبناء للإنتاج:

```bash
npm run build
npm start
```

اختياري: انسخ `.env.example` إلى `.env.local` وعدّل `NEXT_PUBLIC_SITE_URL` قبل النشر حتى تكون روابط `sitemap` و`robots` و`metadataBase` صحيحة.

## الصفحات

- `/` شبكة 12 أداة
- `/tools/image-compressor` ضغط الصور
- `/tools/webp-to-jpg` تحويل WEBP إلى JPG
- `/tools/png-to-pdf` تحويل PNG إلى PDF
- `/tools/qr-generator` مولد رمز QR
- `/tools/[slug]` بقية الأدوات (صفحة قريباً)
- `/about` · `/privacy-policy` · `/contact` · `/terms`

## التقنيات

Next.js 14 App Router، TypeScript، Tailwind CSS، ESLint، shadcn/ui، lucide-react، browser-image-compression، pdf-lib، qrcode.
