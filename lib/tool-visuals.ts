import type { ToolGroupSlug, ToolSlug } from "@/lib/i18n";

export type ToolVisual = {
  background: string;
  caption: string;
};

export const toolVisuals: Record<ToolSlug, ToolVisual> = {
  "mp4-to-mp3": {
    background: "linear-gradient(145deg, #132033 0%, #1a4a5c 52%, #1a7f96 100%)",
    caption: "MP4 → Audio",
  },
  "mp3-to-wav": {
    background: "linear-gradient(145deg, #162433 0%, #1c4a48 50%, #1a9b88 100%)",
    caption: "MP3 → WAV",
  },
  "audio-cutter": {
    background: "linear-gradient(145deg, #1a1630 0%, #2a2150 52%, #6d5bff 100%)",
    caption: "Trim",
  },
  "image-compressor": {
    background: "linear-gradient(180deg, #e8f4ff 0%, #cde6fb 100%)",
    caption: "Compress",
  },
  "webp-to-jpg": {
    background: "linear-gradient(180deg, #fff4e8 0%, #ffd9b8 100%)",
    caption: "WEBP → JPG",
  },
  "image-resizer": {
    background: "linear-gradient(180deg, #eef6ff 0%, #d4e4f7 100%)",
    caption: "Resize",
  },
  "color-picker": {
    background: "linear-gradient(180deg, #f3e9ff 0%, #f8d4e8 100%)",
    caption: "HEX · RGB",
  },
  "png-to-pdf": {
    background: "linear-gradient(180deg, #fff8f6 0%, #ffd4ce 100%)",
    caption: "PNG → PDF",
  },
  "pdf-compressor": {
    background: "linear-gradient(180deg, #fff6f4 0%, #ffcfc9 100%)",
    caption: "PDF",
  },
  "pdf-merger": {
    background: "linear-gradient(180deg, #fff7f5 0%, #ffd2cc 100%)",
    caption: "PDF",
  },
  "word-counter": {
    background: "linear-gradient(180deg, #f4f0e6 0%, #e4dcc8 100%)",
    caption: "Words",
  },
  base64: {
    background: "linear-gradient(180deg, #eef2ff 0%, #d7def7 100%)",
    caption: "Base64",
  },
  "qr-generator": {
    background: "linear-gradient(180deg, #ecfbf4 0%, #c8eedd 100%)",
    caption: "QR",
  },
  "qr-reader": {
    background: "linear-gradient(180deg, #e7f6ff 0%, #c9e6f6 100%)",
    caption: "Scan",
  },
  "password-generator": {
    background: "linear-gradient(180deg, #fff4d8 0%, #f6d48a 100%)",
    caption: "Secure",
  },
};

export const categoryVisuals: Record<
  ToolGroupSlug,
  {
    wrap: string;
    kicker: string;
    mark: string;
  }
> = {
  audio: {
    wrap: "border-primary/30 bg-gradient-to-br from-card via-card to-primary/10",
    kicker: "text-primary",
    mark: "bg-[#152238] text-white",
  },
  images: {
    wrap: "border-sky-400/35 bg-gradient-to-br from-card via-card to-sky-400/10",
    kicker: "text-sky-700 dark:text-sky-300",
    mark: "bg-sky-600 text-white",
  },
  pdf: {
    wrap: "border-[#E1251B]/35 bg-gradient-to-br from-[#fff8f6] via-card to-[#ffe4e0] dark:from-[#2a1214] dark:via-card dark:to-[#3a1618]",
    kicker: "text-[#E1251B] dark:text-[#ff8a80]",
    mark: "bg-[#E1251B] text-white",
  },
  text: {
    wrap: "border-indigo-400/30 bg-gradient-to-br from-card via-card to-indigo-400/10",
    kicker: "text-indigo-700 dark:text-indigo-300",
    mark: "bg-indigo-600 text-white",
  },
  quick: {
    wrap: "border-amber-400/35 bg-gradient-to-br from-card via-card to-amber-400/10",
    kicker: "text-amber-700 dark:text-amber-300",
    mark: "bg-amber-500 text-white",
  },
};
