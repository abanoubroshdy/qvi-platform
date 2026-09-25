import { siteConfig } from "@/lib/site";

export type SeoPage = {
  title: string;
  description: string;
  path: `/${string}` | "/";
};

/**
 * English titles and descriptions for indexable pages.
 * Titles stay within about 60 characters; descriptions stay near 140–160.
 * Wording matches claims already made on the page.
 */
export const pageMeta = {
  home: {
    title: "QVI – AI Stem Separation & Audio Tools, On-Device",
    description: siteConfig.description,
    path: "/",
  },
  qv1: {
    title: "QV1 – AI Stem Splitter & Vocal Remover (Desktop) | QVI",
    description:
      "Download free QV1 Evaluation for Windows: 4 AI stems, Drum Split (DSP), stem editing, and mix tools. Runs on your PC — nothing is uploaded.",
    path: "/products/qv1",
  },
  neyora: {
    title: "Neyora – AI Instrument from Text, Voice or MIDI | QVI",
    description:
      "Turn a text prompt, a hummed melody, or MIDI into a solo instrument performance. Neyora uses DDSP for expressive, editable tone. In development.",
    path: "/products/neyora",
  },
  studio: {
    title: "Free Online Multitrack Audio Mixer – No Upload | QVI",
    description:
      "Mix tracks, change tempo and pitch, tap BPM, and export in your browser. QVI Studio is a free multitrack mixer — audio never leaves your device.",
    path: "/studio",
  },
  tools: {
    title: "Free Online Tools – Audio, PDF, Image, No Upload | QVI",
    description:
      "17 free browser tools: video to MP3, audio cutter, PDF to Word, PDF merge, image compressor, QR codes and more. Files are processed on your device.",
    path: "/tools",
  },
  about: {
    title: "About QVI – On-Device AI Audio Software Studio",
    description:
      "QVI (Quality Virtual Instruments) is an audio software studio building on-device AI audio tools: QV1 stem separation and Neyora DDSP instruments.",
    path: "/about",
  },
  contact: {
    title: "Contact QVI",
    description:
      "Contact QVI support at support@getqvi.com about QV1, Neyora, waitlists, your account, or the free browser tools.",
    path: "/contact",
  },
  privacy: {
    title: "Privacy Policy",
    description:
      "QVI privacy policy: account and waitlist data, the QV1 desktop app, on-device tools, contact form email delivery, and your rights.",
    path: "/privacy-policy",
  },
  terms: {
    title: "Terms of Use",
    description: "Terms of use for the QVI platform, products, and free browser tools.",
    path: "/terms",
  },
} as const satisfies Record<string, SeoPage>;

export const toolPageMeta = {
  "mp4-to-mp3": {
    title: "MP4 to MP3 Converter – Free, No Upload | QVI",
    description:
      "Extract MP3, WAV, M4A, OGG, or FLAC from MP4, MOV, or WEBM in your browser. Choose bitrate and sample rate. Free, no signup, nothing uploaded.",
    path: "/tools/mp4-to-mp3",
  },
  "mp3-to-wav": {
    title: "Audio Converter – Batch MP3, WAV, FLAC | QVI",
    description:
      "Convert MP3, WAV, M4A, AAC, OGG, FLAC, or Opus in a batch. Shared quality settings, then download files or a ZIP. Free, and nothing is uploaded.",
    path: "/tools/mp3-to-wav",
  },
  "audio-cutter": {
    title: "Audio Cutter Online – Trim, Fade & Join MP3 | QVI",
    description:
      "Cut, trim, fade, join, and layer audio clips in the browser for free. FFmpeg runs locally. Export MP3 or WAV — no upload and no account.",
    path: "/tools/audio-cutter",
  },
  "tempo-pitch": {
    title: "Tempo & Pitch Changer – Tap BPM, No Upload | QVI",
    description:
      "Tap a BPM, change tempo by BPM or percent, and shift pitch in semitones and cents. Free tempo and pitch changer in your browser — nothing uploaded.",
    path: "/tools/tempo-pitch",
  },
  "image-compressor": {
    title: "Free Image Compressor – No Upload | QVI",
    description:
      "Shrink JPG, PNG, and WEBP files in your browser with a live size comparison. Free image compressor — photos stay on your device, no signup.",
    path: "/tools/image-compressor",
  },
  "webp-to-jpg": {
    title: "WEBP to JPG Converter – Free, No Upload | QVI",
    description:
      "Convert WEBP images to compatible JPG files in your browser. Free and instant, for apps that expect JPEG. The image is never uploaded.",
    path: "/tools/webp-to-jpg",
  },
  "image-resizer": {
    title: "Image Resizer Online – Free, No Upload | QVI",
    description:
      "Resize images by width and height in pixels, with an optional locked aspect ratio. Canvas resizing stays on your device. Free, with no upload.",
    path: "/tools/image-resizer",
  },
  "color-picker": {
    title: "Color Picker Online – HEX, RGB, HSL | QVI",
    description:
      "Pick a color and copy HEX, RGB, and HSL values instantly. A free online color picker in your browser. Recent colors stay on this device only.",
    path: "/tools/color-picker",
  },
  "png-to-pdf": {
    title: "PNG to PDF Converter – Free, No Upload | QVI",
    description:
      "Turn one or more PNG images into a PDF, one page per image. Free PNG to PDF conversion in your browser — the files are never uploaded.",
    path: "/tools/png-to-pdf",
  },
  "pdf-compressor": {
    title: "PDF Compressor – Free, No Upload | QVI",
    description:
      "Reduce PDF file size in your browser with a quality slider and a live size comparison. Free PDF compressor — the file never leaves your device.",
    path: "/tools/pdf-compressor",
  },
  "pdf-merger": {
    title: "Merge PDF Online – Free, No Upload | QVI",
    description:
      "Combine several PDFs into one ordered document. Reorder, preview, and download in your browser. Free PDF merger — nothing is uploaded.",
    path: "/tools/pdf-merger",
  },
  "pdf-to-word": {
    title: "PDF to Word Converter – Free, No Upload | QVI",
    description:
      "Convert a PDF to an editable Word (DOCX) file in your browser. Selectable text keeps font size, bold, and images. Free, private, and no signup.",
    path: "/tools/pdf-to-word",
  },
  "word-counter": {
    title: "Word Counter Online – Free, No Upload | QVI",
    description:
      "Count words, characters, sentences, paragraphs, and reading time as you type. A free online word counter. Your text stays in the browser.",
    path: "/tools/word-counter",
  },
  base64: {
    title: "Base64 Encode & Decode – Free, No Upload | QVI",
    description:
      "Encode text or files to Base64 and decode Base64 back to text in your browser. Free Base64 tool on your device, with nothing uploaded.",
    path: "/tools/base64",
  },
  "qr-generator": {
    title: "QR Code Generator – Free, No Upload | QVI",
    description:
      "Create a QR code from any link or text and download it as a PNG. Free online QR generator built in your browser. Nothing is uploaded.",
    path: "/tools/qr-generator",
  },
  "qr-reader": {
    title: "QR Code Reader – From Image, No Upload | QVI",
    description:
      "Read a QR code from an image on your device. No camera and no upload — decoding runs in the browser. Free QR reader from a picture file.",
    path: "/tools/qr-reader",
  },
  "password-generator": {
    title: "Password Generator – Free, No Upload | QVI",
    description:
      "Generate a strong random password with the length and symbols you choose. Uses the browser crypto API on your device. Nothing is uploaded or stored.",
    path: "/tools/password-generator",
  },
} as const satisfies Record<string, SeoPage>;
