import type { Metadata } from "next";
import { ToolPage } from "@/components/ToolPage";
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
  return (
    <ToolPage
      category="أدوات الصور"
      title="ضغط الصور أونلاين بدون رفع"
      description="قلّل حجم صورك خلال ثوانٍ مع الإبقاء على الوضوح المناسب للنشر أو الإرسال. المعالجة تتم على جهازك فقط للحفاظ على خصوصيتك."
      howToTitle="كيف تضغط صورة بهذه الأداة؟"
      howToSteps={howToSteps}
      howToNote="لا نحتفظ بنسخ من صورك، ولا نطلب صلاحيات حساب. أغلق الصفحة متى شئت وستختفي الملفات من ذاكرة المتصفح."
      faqs={faqs}
      jsonLdName="ضغط الصور | تولز عرب"
      canonicalPath="/tools/image-compressor"
      applicationCategory="MultimediaApplication"
    >
      <ImageCompressor />
    </ToolPage>
  );
}
