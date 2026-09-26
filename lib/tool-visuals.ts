import type { ToolGroupSlug, ToolSlug } from "@/lib/i18n";

export type ToolVisual = {
  background: string;
  caption: string;
};

export const toolVisuals: Record<ToolSlug, ToolVisual> = {
  "mp4-to-mp3": {
    background: "linear-gradient(145deg, #0B1220 0%, #312E81 52%, #4338CA 100%)",
    caption: "MP4 → Audio",
  },
  "video-converter": {
    background: "linear-gradient(145deg, #0B1220 0%, #1E1B4B 48%, #6D28D9 100%)",
    caption: "Video → Video",
  },
  "mp3-to-wav": {
    background: "linear-gradient(145deg, #0B1220 0%, #164E63 50%, #0891B2 100%)",
    caption: "Any → Audio",
  },
  "audio-cutter": {
    background: "linear-gradient(145deg, #0B1220 0%, #3730A3 52%, #4F46E5 100%)",
    caption: "Trim",
  },
  "tempo-pitch": {
    background: "linear-gradient(145deg, #0B1220 0%, #155E75 50%, #0891B2 100%)",
    caption: "BPM · Pitch",
  },
  "image-compressor": {
    background: "linear-gradient(180deg, #F8FAFC 0%, #E0F2FE 100%)",
    caption: "Compress",
  },
  "webp-to-jpg": {
    background: "linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)",
    caption: "WEBP → JPG",
  },
  "image-resizer": {
    background: "linear-gradient(180deg, #F8FAFC 0%, #E0E7FF 100%)",
    caption: "Resize",
  },
  "color-picker": {
    background: "linear-gradient(180deg, #F8FAFC 0%, #E0E7FF 100%)",
    caption: "HEX · RGB",
  },
  "png-to-pdf": {
    background: "linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)",
    caption: "PNG → PDF",
  },
  "pdf-compressor": {
    background: "linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)",
    caption: "PDF",
  },
  "pdf-merger": {
    background: "linear-gradient(180deg, #F8FAFC 0%, #E0E7FF 100%)",
    caption: "PDF",
  },
  "pdf-to-word": {
    background: "linear-gradient(180deg, #F8FAFC 0%, #E0E7FF 100%)",
    caption: "PDF → Word",
  },
  "word-counter": {
    background: "linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)",
    caption: "Words",
  },
  base64: {
    background: "linear-gradient(180deg, #F8FAFC 0%, #E0E7FF 100%)",
    caption: "Base64",
  },
  "qr-generator": {
    background: "linear-gradient(180deg, #F8FAFC 0%, #CFFAFE 100%)",
    caption: "QR",
  },
  "qr-reader": {
    background: "linear-gradient(180deg, #F8FAFC 0%, #E0F2FE 100%)",
    caption: "Scan",
  },
  "password-generator": {
    background: "linear-gradient(180deg, #F8FAFC 0%, #E0E7FF 100%)",
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
    mark: "bg-[#0B1220] text-white",
  },
  images: {
    wrap: "border-[#0891B2]/30 bg-gradient-to-br from-card via-card to-[#0891B2]/10",
    kicker: "text-primary",
    mark: "bg-[#0891B2] text-[#0B1220]",
  },
  pdf: {
    wrap: "border-primary/25 bg-gradient-to-br from-card via-card to-primary/10",
    kicker: "text-primary",
    mark: "bg-[#4338CA] text-white",
  },
  text: {
    wrap: "border-primary/25 bg-gradient-to-br from-card via-card to-primary/5",
    kicker: "text-primary",
    mark: "bg-[#1E293B] text-white",
  },
  quick: {
    wrap: "border-[#0891B2]/25 bg-gradient-to-br from-card via-card to-[#0891B2]/10",
    kicker: "text-primary",
    mark: "bg-[#0284C8] text-[#0B1220]",
  },
};
