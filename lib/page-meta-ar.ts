import { ar } from "@/lib/i18n/ar";
import { stripLocale } from "@/lib/i18n/locale-path";
import { isToolCategory, toolCategoryPath } from "@/lib/tools";

export type ArabicSeo = {
  title: string;
  description: string;
};

/**
 * Modern Standard Arabic titles and descriptions.
 * They translate the English metadata and keep the same claims:
 * QV1 Evaluation is a free Windows download; Neyora is in development.
 */
const pages: Record<string, ArabicSeo> = {
  "/": {
    title: "QVI – فصل المسارات بالذكاء الاصطناعي وأدوات الصوت على الجهاز",
    description:
      "تبني QVI برامج صوت بالذكاء الاصطناعي تعمل على الجهاز: فصل المسارات وإزالة الفوكال في QV1، وآلات DDSP في Neyora. مع أدوات مجانية للصوت وPDF والصور — بلا رفع.",
  },
  "/products/qv1": {
    title: "QV1 – فاصل المسارات وإزالة الفوكال (سطح المكتب) | QVI",
    description:
      "حمّل QV1 Evaluation لويندوز مجانًا: 4 ستيمز بالذكاء الاصطناعي، وفصل الطبول (DSP)، وتحرير الستيمز، وأدوات المزج. يعمل على حاسوبك — بلا رفع.",
  },
  "/products/neyora": {
    title: "Neyora – آلة بالذكاء الاصطناعي من نص أو صوت أو MIDI | QVI",
    description:
      "حوّل نصًا أو لحنًا مهموسًا أو MIDI إلى أداء آلة منفردة. تستخدم Neyora تقنية DDSP لنبرة معبّرة قابلة للتعديل. قيد التطوير.",
  },
  "/studio": {
    title: "مكسر صوت متعدد المسارات مجاني عبر الإنترنت — بلا رفع | QVI",
    description:
      "امزج المسارات، وغيّر السرعة والطبقة، واضغط الإيقاع، وصدّر من المتصفح. QVI Studio مكسر متعدد المسارات مجاني — الصوت لا يغادر جهازك.",
  },
  "/tools": {
    title: "أدوات مجانية أونلاين — صوت وPDF وصور بلا رفع | QVI",
    description:
      "أدوات مجانية في المتصفح: فيديو إلى MP3، ومحوّل فيديو، وقص الصوت، وPDF إلى Word، ودمج PDF، وضغط الصور، ورموز QR وغيرها. تُعالَج الملفات على جهازك.",
  },
  "/about": {
    title: "عن QVI – استوديو برامج صوت بالذكاء الاصطناعي على الجهاز",
    description:
      "QVI ‏(Quality Virtual Instruments) استوديو برامج صوت يبني أدوات ذكاء اصطناعي على الجهاز: فصل المسارات في QV1 وآلات DDSP في Neyora.",
  },
  "/contact": {
    title: "تواصل مع QVI",
    description:
      "تواصل مع دعم QVI على support@getqvi.com بخصوص QV1 أو Neyora أو قوائم الانتظار أو حسابك أو الأدوات المجانية.",
  },
  "/privacy-policy": {
    title: "سياسة الخصوصية | QVI",
    description:
      "سياسة خصوصية QVI: بيانات الحساب وقائمة الانتظار، وتطبيق QV1 لسطح المكتب، والأدوات على الجهاز، وإرسال نموذج التواصل بالبريد، وحقوقك.",
  },
  "/terms": {
    title: "شروط الاستخدام | QVI",
    description: "شروط استخدام منصة QVI ومنتجاتها وأدوات المتصفح المجانية.",
  },
  "/qv1": {
    title: "QV1 Evaluation – تحميل ويندوز المجاني | QVI",
    description: ar.qv1Page.metaDescription,
  },
  "/qv1/models": {
    title: "مصادر النماذج والتراخيص | QVI",
    description:
      "مصادر وتراخيص النماذج التي تستخدمها QV1 Evaluation. أوزان BS-RoFormer من ZFTurbo طرف ثالث وغير تجارية، حوّلتها QVI إلى ONNX. ليست نماذج أصلية من QVI.",
  },
  "/login": {
    title: "تسجيل الدخول | QVI",
    description: "سجّل الدخول أو أنشئ حساب QVI لتحميل QV1 Evaluation وإدارة مكانك في قائمة الانتظار.",
  },
  "/account": {
    title: "الحساب | QVI",
    description: "إدارة حساب QVI.",
  },
};

const tools: Record<string, ArabicSeo> = {
  "/tools/mp4-to-mp3": {
    title: "تحويل MP4 إلى MP3 — مجاني وبلا رفع | QVI",
    description:
      "استخرج MP3 أو WAV أو M4A أو OGG أو FLAC من MP4 أو MOV أو WEBM في المتصفح. اختر معدل البت والتردد. مجاني، بلا حساب، وبلا رفع.",
  },
  "/tools/video-converter": {
    title: "محوّل الفيديو — MP4 وWebM وMKV | QVI",
    description:
      "حوّل MP4 أو MOV أو MKV أو WebM وغيرها إلى MP4 أو WebM أو MKV أو MOV أو AVI أو GIF. إعادة تغليف أو ترميز في المتصفح. الملفات لا تغادر جهازك.",
  },
  "/tools/mp3-to-wav": {
    title: "محوّل الصوت — دفعة MP3 وWAV وFLAC | QVI",
    description:
      "حوّل MP3 أو WAV أو M4A أو AAC أو OGG أو FLAC أو Opus دفعة واحدة. إعدادات جودة مشتركة، ثم نزّل الملفات أو ملف ZIP. مجاني وبلا رفع.",
  },
  "/tools/audio-cutter": {
    title: "قص الصوت أونلاين — قص وتلاشٍ ودمج MP3 | QVI",
    description:
      "قص المقاطع وقصّرها وأضف تلاشيًا وادمجها ونسّقها في المتصفح مجانًا. يعمل FFmpeg محليًا. صدّر MP3 أو WAV — بلا رفع وبلا حساب.",
  },
  "/tools/tempo-pitch": {
    title: "تغيير السرعة والطبقة — عدّاد BPM بلا رفع | QVI",
    description:
      "اضغط لحساب BPM، وغيّر السرعة بالعدد أو النسبة، وانقل الطبقة بأنصاف الأبعاد والسنت. أداة مجانية في المتصفح — بلا رفع.",
  },
  "/tools/image-compressor": {
    title: "ضغط الصور مجانًا — بلا رفع | QVI",
    description:
      "صغّر ملفات JPG وPNG وWEBP في المتصفح مع مقارنة فورية للحجم. ضاغط صور مجاني — الصور تبقى على جهازك، بلا حساب.",
  },
  "/tools/webp-to-jpg": {
    title: "تحويل WEBP إلى JPG — مجاني وبلا رفع | QVI",
    description:
      "حوّل صور WEBP إلى ملفات JPG متوافقة في المتصفح. مجاني وفوري، للتطبيقات التي تتوقع JPEG. الصورة لا تُرفع.",
  },
  "/tools/image-resizer": {
    title: "تغيير حجم الصور أونلاين — مجاني وبلا رفع | QVI",
    description:
      "غيّر عرض الصورة وارتفاعها بالبكسل، مع قفل اختياري لنسبة الأبعاد. التغيير يتم على جهازك. مجاني وبلا رفع.",
  },
  "/tools/color-picker": {
    title: "منتقي الألوان — HEX وRGB وHSL | QVI",
    description:
      "اختر لونًا وانسخ قيم HEX وRGB وHSL فورًا. منتقي ألوان مجاني في المتصفح. الألوان الأخيرة تبقى على هذا الجهاز فقط.",
  },
  "/tools/png-to-pdf": {
    title: "تحويل PNG إلى PDF — مجاني وبلا رفع | QVI",
    description:
      "حوّل صورة PNG واحدة أو أكثر إلى PDF، صفحة لكل صورة. تحويل مجاني في المتصفح — الملفات لا تُرفع.",
  },
  "/tools/pdf-compressor": {
    title: "ضغط PDF — مجاني وبلا رفع | QVI",
    description:
      "صغّر حجم PDF في المتصفح بشريط جودة ومقارنة فورية للحجم. ضاغط PDF مجاني — الملف لا يغادر جهازك.",
  },
  "/tools/pdf-merger": {
    title: "دمج PDF أونلاين — مجاني وبلا رفع | QVI",
    description:
      "اجمع عدة ملفات PDF في مستند واحد مرتّب. أعد الترتيب، عاين، ثم نزّل من المتصفح. دمج مجاني — بلا رفع.",
  },
  "/tools/pdf-to-word": {
    title: "تحويل PDF إلى Word — مجاني وبلا رفع | QVI",
    description:
      "حوّل PDF إلى ملف Word ‏(DOCX) قابل للتعديل في المتصفح. النص القابل للتحديد يحافظ على حجم الخط والعريض والصور. مجاني وخاص وبلا حساب.",
  },
  "/tools/word-counter": {
    title: "عدّاد الكلمات أونلاين — مجاني وبلا رفع | QVI",
    description:
      "عدّ الكلمات والأحرف والجمل والفقرات ووقت القراءة أثناء الكتابة. عدّاد كلمات مجاني. النص يبقى في المتصفح.",
  },
  "/tools/base64": {
    title: "ترميز Base64 وفكه — مجاني وبلا رفع | QVI",
    description:
      "رمّز نصًا أو ملفات إلى Base64 وفك Base64 إلى نص في المتصفح. أداة مجانية على جهازك، وبلا رفع.",
  },
  "/tools/qr-generator": {
    title: "مولّد رمز QR — مجاني وبلا رفع | QVI",
    description:
      "أنشئ رمز QR من أي رابط أو نص ونزّله بصيغة PNG. مولّد مجاني يعمل في المتصفح. لا شيء يُرفع.",
  },
  "/tools/qr-reader": {
    title: "قارئ رمز QR من صورة — بلا رفع | QVI",
    description:
      "اقرأ رمز QR من صورة على جهازك. بلا كاميرا وبلا رفع — فك الترميز يجري في المتصفح. قارئ مجاني من ملف صورة.",
  },
  "/tools/password-generator": {
    title: "مولّد كلمات المرور — مجاني وبلا رفع | QVI",
    description:
      "أنشئ كلمة مرور عشوائية قوية بالطول والرموز التي تختارها. يستخدم واجهة التشفير في المتصفح على جهازك. لا شيء يُرفع أو يُخزَّن.",
  },
};

export function arabicSeoForPath(pathname: string): ArabicSeo | null {
  const path = stripLocale(pathname);
  if (pages[path]) return pages[path];
  if (tools[path]) return tools[path];
  if (path.startsWith("/tools/")) {
    const slug = path.slice("/tools/".length);
    if (isToolCategory(slug) && toolCategoryPath(slug) === path) {
      const group = ar.toolGroups[slug];
      return { title: `${group.title} | QVI`, description: group.lead };
    }
  }
  return null;
}

export function requireArabicSeo(pathname: string): ArabicSeo {
  const seo = arabicSeoForPath(pathname);
  if (!seo) throw new Error(`Missing Arabic metadata for ${pathname}`);
  return seo;
}
