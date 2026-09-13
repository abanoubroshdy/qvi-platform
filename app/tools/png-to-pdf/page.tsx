import type { Metadata } from "next";
import { ToolPage } from "@/components/ToolPage";
import { PngToPdf } from "@/components/tools/PngToPdf";
import { siteConfig } from "@/lib/site";

const pageTitle = "تحويل PNG إلى PDF أونلاين بدون رفع";
const pageDescription =
  "حوّل صور PNG إلى ملف PDF جاهز للمشاركة أو الطباعة من المتصفح. يمكنك دمج عدة صور، والمعالجة محلية بالكامل.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/png-to-pdf" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/png-to-pdf`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

const faqs = [
  {
    question: "هل يُرفع ملف PNG إلى الخادم؟",
    answer:
      "لا. الأداة تستخدم مكتبة pdf-lib داخل المتصفح لإنشاء المستند محلياً. لا توجد مسارات API لرفع الصور.",
  },
  {
    question: "هل يمكن تحويل أكثر من صورة دفعة واحدة؟",
    answer:
      "نعم. اختر عدة ملفات PNG وستصبح كل صورة صفحة مستقلة في ملف PDF واحد، مع الحفاظ على ترتيب الاختيار.",
  },
  {
    question: "هل تُحفظ شفافية PNG؟",
    answer:
      "نعم قدر الإمكان. التضمين يتم بصيغة PNG داخل PDF، لذلك تبقى المناطق الشفافة كما هي فوق خلفية الصفحة.",
  },
  {
    question: "ما حجم الصفحة الناتج؟",
    answer:
      "تُضبط أبعاد كل صفحة حسب الصورة مع حد أقصى قريب من مقاس A4 حتى لا ينتج ملف بعرض غير عملي للعرض أو الطباعة.",
  },
  {
    question: "هل أحتاج برنامجاً إضافياً؟",
    answer: "لا. يكفي متصفح حديث. بعد التنزيل يمكنك فتح الملف بأي قارئ PDF على الجوال أو الحاسوب.",
  },
];

const howToSteps = [
  "اسحب صورة PNG واحدة أو أكثر إلى منطقة التحويل.",
  "راجع المصغّرات للتأكد من الملفات الصحيحة.",
  "انتظر إنشاء PDF أو اضغط «تحويل إلى PDF».",
  "عاين المستند داخل الصفحة ثم نزّله إلى جهازك.",
];

export default function PngToPdfPage() {
  return (
    <ToolPage
      category="أدوات PDF"
      title="تحويل PNG إلى PDF بدون رفع"
      description="اجمع صورك في مستند PDF مرتب خلال ثوانٍ. مناسب للمشاركة، والأرشفة، والطباعة، مع بقاء الملفات على جهازك."
      howToTitle="كيف تحوّل PNG إلى PDF؟"
      howToSteps={howToSteps}
      howToNote="لا نطلع على صورك ولا نخزّنها. الملف الناتج يُنشأ في المتصفح ثم يُنزَّل إليك مباشرة."
      faqs={faqs}
      jsonLdName="تحويل PNG إلى PDF | تولز عرب"
      canonicalPath="/tools/png-to-pdf"
      applicationCategory="FileApplication"
    >
      <PngToPdf />
    </ToolPage>
  );
}
