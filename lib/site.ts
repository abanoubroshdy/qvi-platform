export const siteConfig = {
  name: "QVI",
  fullName: "QVI - Quality Virtual Instruments",
  tagline: "The Future of Intelligent Audio",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://qvi.audio",
  description:
    "QVI builds intelligent audio tools that run on your device. From AI stem separation to DDSP instrument synthesis, plus free browser utilities that never upload your files.",
  keywords: [
    "QVI",
    "Quality Virtual Instruments",
    "QV1",
    "Neyora",
    "AI stem separation",
    "DDSP",
    "intelligent audio",
    "on-device audio",
    "free online tools",
  ],
  email: "hello@qvi.audio",
  locale: "en",
} as const;
