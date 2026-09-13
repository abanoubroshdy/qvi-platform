import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <p className="text-sm font-bold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-extrabold">الصفحة غير موجودة</h1>
      <p className="mt-3 text-sm leading-8 text-muted-foreground">
        الرابط الذي طلبته غير صحيح أو نُقلت الصفحة. عد إلى الأدوات المجانية وابدأ من هناك.
      </p>
      <Button asChild className="mt-6" size="lg">
        <Link href="/">العودة إلى الرئيسية</Link>
      </Button>
    </div>
  );
}
