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
import type { ToolSlug } from "@/lib/i18n";

export type Tool = {
  slug: ToolSlug;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  available: boolean;
  category: "images" | "pdf" | "text" | "qr" | "other";
};

export const tools: Tool[] = [
  {
    slug: "image-compressor",
    title: "Image Compressor",
    description: "Shrink JPG, PNG, and WEBP files in your browser with a live size comparison.",
    href: "/tools/image-compressor",
    icon: ImageDown,
    available: true,
    category: "images",
  },
  {
    slug: "webp-to-jpg",
    title: "WEBP to JPG",
    description: "Convert WEBP images to compatible JPG files without uploading anything.",
    href: "/tools/webp-to-jpg",
    icon: Images,
    available: true,
    category: "images",
  },
  {
    slug: "png-to-pdf",
    title: "PNG to PDF",
    description: "Turn one or more PNG images into a shareable PDF, one page per image.",
    href: "/tools/png-to-pdf",
    icon: FileImage,
    available: true,
    category: "pdf",
  },
  {
    slug: "pdf-compressor",
    title: "PDF Compressor",
    description: "Reduce PDF file size for faster sending while keeping the document readable.",
    href: "/tools/pdf-compressor",
    icon: FileArchive,
    available: false,
    category: "pdf",
  },
  {
    slug: "pdf-merger",
    title: "PDF Merger",
    description: "Combine several PDFs into a single ordered document in seconds.",
    href: "/tools/pdf-merger",
    icon: Files,
    available: false,
    category: "pdf",
  },
  {
    slug: "qr-generator",
    title: "QR Generator",
    description: "Create a high-quality QR code from any link or text and download it as PNG.",
    href: "/tools/qr-generator",
    icon: QrCode,
    available: true,
    category: "qr",
  },
  {
    slug: "image-resizer",
    title: "Image Resizer",
    description: "Change image dimensions in pixels, with or without locking aspect ratio.",
    href: "/tools/image-resizer",
    icon: Scaling,
    available: true,
    category: "images",
  },
  {
    slug: "word-counter",
    title: "Word Counter",
    description: "Count words, characters, and paragraphs in any text instantly.",
    href: "/tools/word-counter",
    icon: Type,
    available: true,
    category: "text",
  },
  {
    slug: "password-generator",
    title: "Password Generator",
    description: "Generate strong random passwords with the length and symbols you choose.",
    href: "/tools/password-generator",
    icon: KeyRound,
    available: true,
    category: "other",
  },
  {
    slug: "base64",
    title: "Base64 Tool",
    description: "Encode and decode text or files as Base64 entirely on your device.",
    href: "/tools/base64",
    icon: Binary,
    available: true,
    category: "text",
  },
  {
    slug: "color-picker",
    title: "Color Picker",
    description: "Pick precise colors and copy HEX, RGB, and HSL values instantly.",
    href: "/tools/color-picker",
    icon: Pipette,
    available: true,
    category: "other",
  },
  {
    slug: "qr-reader",
    title: "QR Reader",
    description: "Read a QR code from an uploaded image without needing a camera.",
    href: "/tools/qr-reader",
    icon: ScanLine,
    available: true,
    category: "qr",
  },
];

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}

export const upcomingTools = tools.filter((tool) => !tool.available);
export const availableTools = tools.filter((tool) => tool.available);
