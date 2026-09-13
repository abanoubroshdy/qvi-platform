import {
  Binary,
  FileArchive,
  FileImage,
  Files,
  ImageDown,
  Images,
  KeyRound,
  Pipette,
  QrCode,
  Scaling,
  ScanLine,
  Type,
  type LucideIcon,
} from "lucide-react";

export type Tool = {
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  href: string;
  icon: LucideIcon;
  available: boolean;
  category: "images" | "pdf" | "text" | "qr" | "other";
};

export const tools: Tool[] = [
  {
    slug: "image-compressor",
    title: "ضغط الصور",
    titleEn: "Image Compressor",
    description: "قلّل حجم صورك مع الحفاظ على الوضوح، مباشرة من المتصفح دون رفع.",
    href: "/tools/image-compressor",
    icon: ImageDown,
    available: true,
    category: "images",
  },
  {
    slug: "webp-to-jpg",
    title: "تحويل WEBP إلى JPG",
    titleEn: "WEBP to JPG",
    description: "حوّل صور WEBP إلى JPG متوافقة مع كل المنصات والتطبيقات.",
    href: "/tools/webp-to-jpg",
    icon: Images,
    available: false,
    category: "images",
  },
  {
    slug: "png-to-pdf",
    title: "تحويل PNG إلى PDF",
    titleEn: "PNG to PDF",
    description: "اجمع صورة PNG في ملف PDF جاهز للمشاركة أو الطباعة.",
    href: "/tools/png-to-pdf",
    icon: FileImage,
    available: false,
    category: "pdf",
  },
  {
    slug: "pdf-compressor",
    title: "ضغط ملفات PDF",
    titleEn: "PDF Compressor",
    description: "خفّف حجم ملفات PDF لتسهيل الإرسال دون فقدان المقروئية.",
    href: "/tools/pdf-compressor",
    icon: FileArchive,
    available: false,
    category: "pdf",
  },
  {
    slug: "pdf-merger",
    title: "دمج ملفات PDF",
    titleEn: "PDF Merger",
    description: "ادمج عدة ملفات PDF في مستند واحد مرتب خلال ثوانٍ.",
    href: "/tools/pdf-merger",
    icon: Files,
    available: false,
    category: "pdf",
  },
  {
    slug: "qr-generator",
    title: "مولد رمز QR",
    titleEn: "QR Generator",
    description: "أنشئ رمز QR لأي رابط أو نص وحمّله كصورة عالية الجودة.",
    href: "/tools/qr-generator",
    icon: QrCode,
    available: false,
    category: "qr",
  },
  {
    slug: "image-resizer",
    title: "تغيير حجم الصور",
    titleEn: "Image Resizer",
    description: "عدّل أبعاد الصورة بالبكسل مع الحفاظ على النسبة أو قصّها حسب الحاجة.",
    href: "/tools/image-resizer",
    icon: Scaling,
    available: false,
    category: "images",
  },
  {
    slug: "word-counter",
    title: "عدّاد الكلمات",
    titleEn: "Word Counter",
    description: "احسب الكلمات والحروف والفقرات في أي نص عربي أو إنجليزي فوراً.",
    href: "/tools/word-counter",
    icon: Type,
    available: false,
    category: "text",
  },
  {
    slug: "password-generator",
    title: "مولد كلمات المرور",
    titleEn: "Password Generator",
    description: "ولّد كلمات مرور قوية وعشوائية بطول ورموز تختارها بنفسك.",
    href: "/tools/password-generator",
    icon: KeyRound,
    available: false,
    category: "other",
  },
  {
    slug: "base64",
    title: "أداة Base64",
    titleEn: "Base64 Tool",
    description: "رمّز وفك ترميز النصوص والملفات بصيغة Base64 بأمان على جهازك.",
    href: "/tools/base64",
    icon: Binary,
    available: false,
    category: "text",
  },
  {
    slug: "color-picker",
    title: "منتقي الألوان",
    titleEn: "Color Picker",
    description: "اختر ألواناً دقيقة واحصل على قيم HEX وRGB وHSL للاستخدام الفوري.",
    href: "/tools/color-picker",
    icon: Pipette,
    available: false,
    category: "other",
  },
  {
    slug: "qr-reader",
    title: "قارئ رمز QR",
    titleEn: "QR Reader",
    description: "اقرأ محتوى رمز QR من صورة مرفوعة دون الحاجة إلى كاميرا خارجية.",
    href: "/tools/qr-reader",
    icon: ScanLine,
    available: false,
    category: "qr",
  },
];

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}

export const upcomingTools = tools.filter((tool) => !tool.available);
export const availableTools = tools.filter((tool) => tool.available);
