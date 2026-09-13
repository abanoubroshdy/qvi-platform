import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { JsonLd } from "@/components/JsonLd";
import { ImageCompressor } from "@/components/tools/ImageCompressor";
import { siteConfig } from "@/lib/site";

const pageTitle = "ضغط الصور أونلاين مجاناً بدون رفع";
const pageDescription =
  "اضغط صور JPG و PNG و WEBP مباشرة من المتصفح. الأداة مجانية، فورية، ولا ترفع ملفاتك إلى أي خادم.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/image-compressor" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/image-compressor`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

const faqs = [
  {
    question: "هل تُرفع الصورة إلى الخادم عند الضغط؟",
    answer:
      "لا. أداة ضغط الصور في تولز عرب تعمل بالكامل داخل متصفحك باستخدام مكتبة ضغط محلية. الصورة لا تُرسل إلى خوادمنا ولا تُخزَّن لدينا.",
  },
  {
    question: "ما صيغ الصور المدعومة؟",
    answer: "يمكنك ضغط ملفات JPG و JPEG و PNG و WEBP و BMP. بعد الضغط يمكنك تنزيل النتيجة فوراً إلى جهازك.",
  },
  {
    question: "هل تنخفض جودة الصورة بعد الضغط؟",
    answer:
      "يمكنك التحكم بالجودة عبر شريط النسبة. القيمة 80٪ توازن جيد بين الحجم والوضوح لمعظم الصور. خفّض النسبة إذا احتجت ملفاً أصغر، أو ارفعها إذا كان الوضوح أولوية.",
  },
  {
    question: "هل الأداة مجانية بدون حدود؟",
    answer:
      "نعم. لا تحتاج إلى تسجيل حساب، ولا توجد حدود يومية للضغط. يمكنك استخدام الأداة كلما احتجت ذلك.",
  },
  {
    question: "هل تعمل على الجوال؟",
    answer:
      "نعم. الصفحة متجاوبة وتعمل على الهواتف والأجهزة اللوحية والحواسيب. اختر الصورة من الاستوديو أو أسقطها إن كنت على حاسوب.",
  },
];

const howToSteps = [
  "اختر صورة من جهازك أو اسحبها إلى منطقة الرفع.",
  "اضبط شريط الجودة حسب الحجم الذي تحتاجه.",
  "انتظر الضغط الفوري أو اضغط زر «ضغط الصورة».",
  "قارن الحجم الأصلي بالحجم الجديد ثم نزّل النتيجة.",
];

export default function ImageCompressorPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "كيفية ضغط صورة مجاناً بدون رفع",
    description: pageDescription,
    inLanguage: "ar",
    step: howToSteps.map((text, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text,
    })),
  };

  const appLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "ضغط الصور | تولز عرب",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    inLanguage: "ar",
    url: `${siteConfig.url}/tools/image-compressor`,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <JsonLd data={faqLd} />
      <JsonLd data={howToLd} />
      <JsonLd data={appLd} />

      <header className="mb-6">
        <p className="mb-2 text-sm font-bold text-primary">أدوات الصور</p>
        <h1 className="text-3xl font-extrabold leading-snug sm:text-4xl">ضغط الصور أونلاين بدون رفع</h1>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-muted-foreground sm:text-base">
          قلّل حجم صورك خلال ثوانٍ مع الإبقاء على الوضوح المناسب للنشر أو الإرسال. المعالجة تتم على
          جهازك فقط للحفاظ على خصوصيتك.
        </p>
      </header>

      <ImageCompressor />

      <section className="mt-12 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-extrabold">كيف تضغط صورة بهذه الأداة؟</h2>
        <ol className="mt-4 list-decimal space-y-3 pr-5 text-sm leading-8 sm:text-base">
          {howToSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-8 text-muted-foreground">
          لا نحتفظ بنسخ من صورك، ولا نطلب صلاحيات حساب. أغلق الصفحة متى شئت وستختفي الملفات من ذاكرة
          المتصفح.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-extrabold">الأسئلة الشائعة</h2>
        <Accordion type="single" collapsible className="rounded-xl border bg-card px-4 shadow-sm">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`item-${index}`}>
              <AccordionTrigger className="text-base">{faq.question}</AccordionTrigger>
              <AccordionContent className="leading-8 text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
