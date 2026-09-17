import type { ToolGroupSlug, ToolSlug } from "@/lib/i18n";

export type ToolVisual = {
  panel: string;
  caption: string;
};

export const toolVisuals: Record<ToolSlug, ToolVisual> = {
  "mp4-to-mp3": {
    panel: "bg-[linear-gradient(145deg,#10192b_0%,#16344a_48%,#1a7f96_100%)]",
    caption: "MP4 → Audio",
  },
  "mp3-to-wav": {
    panel: "bg-[linear-gradient(145deg,#142033_0%,#1d3b4a_52%,#2a8f7b_100%)]",
    caption: "MP3 → WAV",
  },
  "audio-cutter": {
    panel: "bg-[linear-gradient(145deg,#1a1630_0%,#2a2150_50%,#6d5bff_100%)]",
    caption: "Trim",
  },
  "image-compressor": {
    panel: "bg-[linear-gradient(180deg,#e8f4ff_0%,#cde6fb_100%)] dark:bg-[linear-gradient(180deg,#102033_0%,#1a3348_100%)]",
    caption: "Compress",
  },
  "webp-to-jpg": {
    panel: "bg-[linear-gradient(180deg,#fff4e8_0%,#ffd9b8_100%)] dark:bg-[linear-gradient(180deg,#2a1c12_0%,#3d2818_100%)]",
    caption: "WEBP → JPG",
  },
  "image-resizer": {
    panel: "bg-[linear-gradient(180deg,#eef6ff_0%,#d4e4f7_100%)] dark:bg-[linear-gradient(180deg,#152033_0%,#24364c_100%)]",
    caption: "Resize",
  },
  "color-picker": {
    panel: "bg-[linear-gradient(180deg,#f3e9ff_0%,#f8d4e8_100%)] dark:bg-[linear-gradient(180deg,#23182d_0%,#3a2240_100%)]",
    caption: "HEX · RGB",
  },
  "png-to-pdf": {
    panel: "bg-[linear-gradient(180deg,#fff8f6_0%,#ffd9d4_100%)] dark:bg-[linear-gradient(180deg,#2c1214_0%,#4a181c_100%)]",
    caption: "PNG → PDF",
  },
  "pdf-compressor": {
    panel: "bg-[linear-gradient(180deg,#fff6f4_0%,#ffcfc9_100%)] dark:bg-[linear-gradient(180deg,#2a1012_0%,#4c161a_100%)]",
    caption: "PDF",
  },
  "pdf-merger": {
    panel: "bg-[linear-gradient(180deg,#fff7f5_0%,#ffd2cc_100%)] dark:bg-[linear-gradient(180deg,#2b1113_0%,#4a171b_100%)]",
    caption: "PDF",
  },
  "word-counter": {
    panel: "bg-[linear-gradient(180deg,#f4f0e6_0%,#e4dcc8_100%)] dark:bg-[linear-gradient(180deg,#262218_0%,#3a3428_100%)]",
    caption: "Words",
  },
  base64: {
    panel: "bg-[linear-gradient(180deg,#eef2ff_0%,#d7def7_100%)] dark:bg-[linear-gradient(180deg,#161a2c_0%,#252c44_100%)]",
    caption: "Base64",
  },
  "qr-generator": {
    panel: "bg-[linear-gradient(180deg,#ecfbf4_0%,#c8eedd_100%)] dark:bg-[linear-gradient(180deg,#10241c_0%,#1c3a2e_100%)]",
    caption: "QR",
  },
  "qr-reader": {
    panel: "bg-[linear-gradient(180deg,#e7f6ff_0%,#c9e6f6_100%)] dark:bg-[linear-gradient(180deg,#102030_0%,#1c3348_100%)]",
    caption: "Scan",
  },
  "password-generator": {
    panel: "bg-[linear-gradient(180deg,#fff4d8_0%,#f6d48a_100%)] dark:bg-[linear-gradient(180deg,#2a210e_0%,#433318_100%)]",
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
