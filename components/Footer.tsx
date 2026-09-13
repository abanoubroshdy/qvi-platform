import Link from "next/link";
import { ShieldCheck, Wrench } from "lucide-react";
import { siteConfig } from "@/lib/site";

const footerLinks = [
  { href: "/about", label: "من نحن" },
  { href: "/privacy-policy", label: "سياسة الخصوصية" },
  { href: "/contact", label: "تواصل معنا" },
  { href: "/terms", label: "شروط الاستخدام" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-extrabold text-primary">
            <Wrench className="h-5 w-5" aria-hidden />
            تولز عرب
          </div>
          <p className="max-w-sm text-sm leading-7 text-muted-foreground">
            مجموعة أدوات عربية مجانية تعمل بالكامل على جهازك. لا نرفع ملفاتك، ولا نتتبع عملك،
            ونضع الخصوصية قبل أي شيء آخر.
          </p>
          <p className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            معالجة محلية 100٪
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold">صفحات أساسية</h2>
          <ul className="space-y-2 text-sm">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-muted-foreground transition hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold">تواصل</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            للاستفسارات والشراكات والإبلاغ عن مشكلة:
            <br />
            <a className="font-medium text-primary hover:underline" href={`mailto:${siteConfig.email}`}>
              {siteConfig.email}
            </a>
          </p>
        </div>
      </div>

      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground sm:text-start">
          © {year} {siteConfig.name} ({siteConfig.nameEn}). جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
