import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "من نحن",
  description:
    "تعرف على تولز عرب: مشروع عربي لأدوات مجانية تعمل على جهازك وتحافظ على خصوصية ملفاتك.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <LegalPage title="من نحن" updatedAt="13 سبتمبر 2026">
      <p>
        تولز عرب ({siteConfig.nameEn}) منصة عربية متخصصة في الأدوات المجانية التي تعمل داخل المتصفح.
        هدفنا أن يجد المستخدم العربي أدوات عملية لضغط الصور وتحويل الملفات وإنشاء الرموز والنصوص،
        دون أن يضطر إلى إنشاء حساب أو رفع ملفاته إلى خادم مجهول.
      </p>
      <h2 className="text-xl font-bold">رسالتنا</h2>
      <p>
        نؤمن أن الخصوصية ليست ميزة إضافية بل حق أساسي. لذلك صُممت الأدوات لتعالج البيانات محلياً على
        جهازك كلما أمكن ذلك. أنت تبقي الملف، ونحن نوفّر الواجهة والشرح والدعم.
      </p>
      <h2 className="text-xl font-bold">ماذا نقدّم؟</h2>
      <p>
        نبدأ بأداة ضغط الصور الجاهزة للاستخدام، ونبني تباعاً أدوات تحويل WEBP و PNG و PDF ومولدات QR
        وعدّاد الكلمات ومولد كلمات المرور وغيرها. جميع الصفحات بالعربية، ومتوافقة مع الجوال، ومصممة
        لتكون سريعة وواضحة.
      </p>
      <h2 className="text-xl font-bold">لماذا أدوات محلية؟</h2>
      <p>
        رفع الملفات إلى خدمات سحابية يعني تسليم نسخ من مستنداتك وصورك لطرف ثالث. كثير من المستخدمين
        لا يحتاجون ذلك لمجرد ضغط صورة أو دمج ملف. المعالجة في المتصفح تقلل المخاطر وتسرّع النتيجة
        لأنها لا تنتظر طابوراً على الخادم.
      </p>
      <h2 className="text-xl font-bold">الإعلانات والاستدامة</h2>
      <p>
        الموقع مجاني للمستخدم. قد نعرض إعلانات غير مزعجة لتغطية تكاليف الاستضافة والتطوير. الإعلانات
        لا تُستخدم كذريعة لرفع ملفاتك أو بيع محتواها. لمعرفة كيف نتعامل مع البيانات، اقرأ{" "}
        <Link href="/privacy-policy" className="font-semibold text-primary hover:underline">
          سياسة الخصوصية
        </Link>
        .
      </p>
      <h2 className="text-xl font-bold">تواصل معنا</h2>
      <p>
        إن كان لديك اقتراح لأداة جديدة أو لاحظت خطأً في أداة قائمة، نرحب برسالتك عبر صفحة{" "}
        <Link href="/contact" className="font-semibold text-primary hover:underline">
          تواصل معنا
        </Link>{" "}
        أو البريد {siteConfig.email}.
      </p>
    </LegalPage>
  );
}
