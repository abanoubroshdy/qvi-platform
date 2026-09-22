import type { ToolGroupSlug, ToolSlug } from "@/lib/i18n";

export type ToolCategory = ToolGroupSlug;

export type Tool = {
  slug: ToolSlug;
  title: string;
  description: string;
  href: string;
  available: boolean;
  category: ToolCategory;
};

export const toolCategoryOrder: readonly ToolCategory[] = ["audio", "images", "pdf", "text", "quick"];

export const tools: Tool[] = [
  {
    slug: "mp4-to-mp3",
    title: "MP4 to audio",
    description: "Extract audio from a video file and download MP3, WAV, M4A, OGG, or FLAC on your device.",
    href: "/tools/mp4-to-mp3",
    available: true,
    category: "audio",
  },
  {
    slug: "mp3-to-wav",
    title: "MP3 to WAV",
    description: "Convert MP3, M4A, or OGG to WAV entirely in your browser.",
    href: "/tools/mp3-to-wav",
    available: true,
    category: "audio",
  },
  {
    slug: "audio-cutter",
    title: "Audio Cutter",
    description: "Trim clips, add fades, join or mix tracks, and pick export sample rate and bitrate on your device.",
    href: "/tools/audio-cutter",
    available: true,
    category: "audio",
  },
  {
    slug: "tempo-pitch",
    title: "Tempo & Pitch",
    description: "Tap approximate BPM, change tempo by BPM or percent, and shift pitch in semitones and cents — without uploading.",
    href: "/tools/tempo-pitch",
    available: true,
    category: "audio",
  },
  {
    slug: "image-compressor",
    title: "Image Compressor",
    description: "Shrink JPG, PNG, and WEBP files in your browser with a live size comparison.",
    href: "/tools/image-compressor",
    available: true,
    category: "images",
  },
  {
    slug: "webp-to-jpg",
    title: "WEBP to JPG",
    description: "Convert WEBP images to compatible JPG files without uploading anything.",
    href: "/tools/webp-to-jpg",
    available: true,
    category: "images",
  },
  {
    slug: "image-resizer",
    title: "Image Resizer",
    description: "Change image dimensions in pixels, with or without locking aspect ratio.",
    href: "/tools/image-resizer",
    available: true,
    category: "images",
  },
  {
    slug: "color-picker",
    title: "Color Picker",
    description: "Pick precise colors and copy HEX, RGB, and HSL values instantly.",
    href: "/tools/color-picker",
    available: true,
    category: "images",
  },
  {
    slug: "png-to-pdf",
    title: "PNG to PDF",
    description: "Turn one or more PNG images into a shareable PDF, one page per image.",
    href: "/tools/png-to-pdf",
    available: true,
    category: "pdf",
  },
  {
    slug: "pdf-compressor",
    title: "PDF Compressor",
    description: "Reduce PDF file size for faster sending while keeping the document readable.",
    href: "/tools/pdf-compressor",
    available: true,
    category: "pdf",
  },
  {
    slug: "pdf-merger",
    title: "PDF Merger",
    description: "Combine several PDFs into a single ordered document in seconds.",
    href: "/tools/pdf-merger",
    available: true,
    category: "pdf",
  },
  {
    slug: "pdf-to-word",
    title: "PDF to Word",
    description: "Convert a PDF to an editable Word document in the browser, keeping text formatting and images.",
    href: "/tools/pdf-to-word",
    available: true,
    category: "pdf",
  },
  {
    slug: "word-counter",
    title: "Word Counter",
    description: "Count words, characters, and paragraphs in any text instantly.",
    href: "/tools/word-counter",
    available: true,
    category: "text",
  },
  {
    slug: "base64",
    title: "Base64 Tool",
    description: "Encode and decode text or files as Base64 entirely on your device.",
    href: "/tools/base64",
    available: true,
    category: "text",
  },
  {
    slug: "qr-generator",
    title: "QR Generator",
    description: "Create a high-quality QR code from any link or text and download it as PNG.",
    href: "/tools/qr-generator",
    available: true,
    category: "quick",
  },
  {
    slug: "qr-reader",
    title: "QR Reader",
    description: "Read a QR code from an uploaded image without needing a camera.",
    href: "/tools/qr-reader",
    available: true,
    category: "quick",
  },
  {
    slug: "password-generator",
    title: "Password Generator",
    description: "Generate strong random passwords with the length and symbols you choose.",
    href: "/tools/password-generator",
    available: true,
    category: "quick",
  },
];

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools
    .filter((tool) => tool.category === category)
    .slice()
    .sort((a, b) => Number(b.available) - Number(a.available));
}

export function getRelatedTools(slug: string, limit = 3): Tool[] {
  const tool = getToolBySlug(slug);
  if (!tool) return [];
  return getToolsByCategory(tool.category)
    .filter((item) => item.slug !== tool.slug)
    .slice(0, limit);
}

export function groupedTools(): { category: ToolCategory; tools: Tool[] }[] {
  return toolCategoryOrder.map((category) => ({
    category,
    tools: getToolsByCategory(category),
  }));
}

export function isToolCategory(value: string): value is ToolCategory {
  return (toolCategoryOrder as readonly string[]).includes(value);
}

export function toolCategoryPath(category: ToolCategory): string {
  return `/tools/${category}`;
}

export const upcomingTools = tools.filter((tool) => !tool.available);
export const availableTools = tools.filter((tool) => tool.available);
