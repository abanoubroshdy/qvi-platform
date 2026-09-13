import type { Metadata } from "next";
import { ToolPage } from "@/components/ToolPage";
import { WebpToJpg } from "@/components/tools/WebpToJpg";
import { siteConfig } from "@/lib/site";

const pageTitle = "تحويل WEBP إلى JPG أونلاين بدون رفع";
const pageDescription =
  "حوّل صور WEBP إلى JPG متوافقة مع كل التطبيقات مباشرة من المتصفح. مجاني، فوري، ولا يرفع ملفاتك إلى أي خادم.";

export function generateMetadata(): Metadata {
  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: "/tools/webp-to-jpg" },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${siteConfig.url}/tools/webp-to-jpg`,
      locale: "ar_AR",
      type: "article",
    },
  };
}

const faqs = [
  {
    question: "هل تُرفع صورة WEBP إلى الخادم؟",
    answer:
      "لا. التحويل يتم داخل المتصفح عبر عنصر Canvas. الملف يبقى على جهازك ويُصدَّر كـ JPG محلياً دون أي مسار رفع.",
  },
  {
    question: "لماذا تصبح الخلفية الشفافة بيضاء؟",
    answer:
      "صيغة JPG لا تدعم الشفافية. لذلك تُرسم الصورة على خلفية بيضاء قبل التصدير حتى لا تظهر مناطق شفافة بلون أسود غير متوقع.",
  },
  {
    question: "هل تبقى أبعاد الصورة كما هي؟",
    answer: "نعم. الأداة تنسخ العرض والارتفاع كما هما، وتكتفي بتغيير الصيغة والجودة التي تختارها.",
  },
  {
    question: "ما المتصفحات المدعومة؟",
    answer:
      "أي متصفح حديث يدعم عرض WEBP وCanvas، بما في ذلك Chrome وFirefox وSafari وEdge على الجوال والحاسوب.",
  },
  {
    question: "هل التحويل مجاني بلا حدود؟",
    answer: "نعم. لا تحتاج إلى حساب، ولا توجد حدود يومية، ويمكنك تحويل أي عدد من الصور على جهازك.",
  },
];

const howToSteps = [
  "اسحب ملف WEBP إلى منطقة التحويل أو اختره من جهازك.",
  "اضبط جودة JPG إن أردت ملفاً أصغر أو أوضح.",
  "انتظر التحويل الفوري أو اضغط «تحويل إلى JPG».",
  "عاين النتيجة ثم نزّل ملف JPG إلى جهازك.",
];

export default function WebpToJpgPage() {
  return (
    <ToolPage
      category="أدوات الصور"
      title="تحويل WEBP إلى JPG بدون رفع"
      description="اجعل صور WEBP متوافقة مع البرامج والمواقع التي تفضّل JPG. التحويل فوري وعلى جهازك فقط."
      howToTitle="كيف تحوّل WEBP إلى JPG؟"
      howToSteps={howToSteps}
      howToNote="لا نحتفظ بنسخة من صورتك. أغلق الصفحة وستختفي الملفات من ذاكرة المتصفح."
      faqs={faqs}
      jsonLdName="تحويل WEBP إلى JPG | تولز عرب"
      canonicalPath="/tools/webp-to-jpg"
      applicationCategory="MultimediaApplication"
    >
      <WebpToJpg />
    </ToolPage>
  );
}
