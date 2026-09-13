import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "راسل فريق تولز عرب للاقتراحات، الإبلاغ عن مشكلة، أو الاستفسارات المتعلقة بالخصوصية.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <LegalPage title="تواصل معنا" updatedAt="13 سبتمبر 2026">
      <p>
        نرحب بملاحظاتك. إن كنت تريد اقتراح أداة، أو الإبلاغ عن خلل، أو سؤالاً عن الخصوصية والإعلانات،
        أرسل رسالتك عبر النموذج أدناه أو مباشرة إلى البريد الإلكتروني. نسعى للرد خلال أيام العمل
        قدر الإمكان.
      </p>
      <div className="rounded-xl border bg-muted/40 p-4 text-sm">
        <p>
          البريد الإلكتروني:{" "}
          <a className="font-semibold text-primary hover:underline" href={`mailto:${siteConfig.email}`}>
            {siteConfig.email}
          </a>
        </p>
        <p className="mt-2 text-muted-foreground">
          لا ترسل ملفات حساسة عبر البريد. أدوات الموقع تعالج الملفات على جهازك، وبريد الدعم مخصص
          للتواصل النصي فقط.
        </p>
      </div>
      <h2 className="text-xl font-bold">نموذج الرسالة</h2>
      <ContactForm />
    </LegalPage>
  );
}
