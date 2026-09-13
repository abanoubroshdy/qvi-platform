import type { Metadata } from "next";
import { ToolPage } from "@/components/ToolPage";
import { QrGenerator } from "@/components/tools/QrGenerator";
import { siteConfig } from "@/lib/site";

const pageTitle = "مولد رمز QR مجاني أونلاين";
const pageDescription =
  "أنشئ رمز QR لأي رابط أو نص عربي وحمّله كصورة PNG عالية الجودة. التوليد يتم على جهازك دون إرسال المحتوى إلى خادم.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/qr-generator" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/qr-generator`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

const faqs = [
  {
    question: "هل يُرسل النص أو الرابط إلى الخادم؟",
    answer:
      "لا. رمز QR يُرسم داخل المتصفح بمكتبة qrcode. المحتوى الذي تكتبه لا يُرفع ولا يُحفظ لدينا.",
  },
  {
    question: "هل يدعم الرمز النصوص العربية؟",
    answer:
      "نعم. يمكنك إدخال روابط أو نصوص عربية أو إنجليزية. يُفضَّل إبقاء النص مختصراً ليسهل المسح.",
  },
  {
    question: "ما مستوى تصحيح الخطأ المستخدم؟",
    answer:
      "المستوى المتوسط (M) يوازن بين سعة البيانات ومقاومة التشويه الخفيف عند الطباعة أو التصوير.",
  },
  {
    question: "بأي صيغة يُحمَّل الرمز؟",
    answer: "يُنزَّل كصورة PNG مربعة. يمكنك اختيار الحجم من 256 إلى 1024 بكسل حسب الاستخدام.",
  },
  {
    question: "هل أحتاج تطبيقاً لمسحه لاحقاً؟",
    answer:
      "معظم كاميرات الهواتف تقرأ QR مباشرة. للطباعة اختر حجماً أكبر حتى يبقى الرمز واضحاً بعد التصغير.",
  },
];

const howToSteps = [
  "اكتب الرابط أو النص في الحقل المخصص.",
  "اضبط حجم الصورة حسب العرض أو الطباعة.",
  "يُنشأ الرمز فوراً، أو اضغط «إنشاء الرمز».",
  "نزّل صورة PNG واستخدمها في موقعك أو مطبوعاتك.",
];

export default function QrGeneratorPage() {
  return (
    <ToolPage
      category="أدوات QR"
      title="مولد رمز QR بدون رفع"
      description="حوّل أي رابط أو نص إلى رمز QR جاهز للتنزيل. مناسب لبطاقات العمل، والقوائم، وروابط المواقع، مع خصوصية كاملة."
      howToTitle="كيف تنشئ رمز QR؟"
      howToSteps={howToSteps}
      howToNote="لا نسجّل ما تكتبه في الحقل. أغلق الصفحة ولن يبقى أي أثر للمحتوى على خوادمنا لأنه لم يُرسل أصلاً."
      faqs={faqs}
      jsonLdName="مولد رمز QR | تولز عرب"
      canonicalPath="/tools/qr-generator"
      applicationCategory="UtilitiesApplication"
    >
      <QrGenerator />
    </ToolPage>
  );
}
