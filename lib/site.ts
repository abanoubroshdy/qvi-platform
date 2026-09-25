import { resolveSiteUrl } from "@/lib/supabase/config";

export const siteConfig = {
  name: "QVI",
  fullName: "QVI - Quality Virtual Instruments",
  tagline: "The Future of Intelligent Audio",
  url: resolveSiteUrl(),
  description:
    "QVI builds on-device AI audio software: QV1 stem separation and vocal remover, and Neyora DDSP instruments. Plus free audio, PDF, and image tools — no upload.",
  keywords: [
    "QVI",
    "Quality Virtual Instruments",
    "QV1",
    "Neyora",
    "AI stem separation",
    "vocal remover",
    "stem splitter",
    "AI instrument",
    "DDSP",
    "intelligent audio",
    "on-device audio",
    "free online tools",
  ],
  /** Public support inbox for contact form and general inquiries. */
  supportEmail: "support@getqvi.com",
  /** Legacy alias — prefer supportEmail for new UI. */
  email: "support@getqvi.com",
  locale: "en",
} as const;
