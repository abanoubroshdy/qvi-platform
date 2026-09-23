import { resolveSiteUrl } from "@/lib/supabase/config";

export const siteConfig = {
  name: "QVI",
  fullName: "QVI - Quality Virtual Instruments",
  tagline: "The Future of Intelligent Audio",
  url: resolveSiteUrl(),
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
  /** Public support inbox for contact form and general inquiries. */
  supportEmail: "support@getqvi.com",
  /** Legacy alias — prefer supportEmail for new UI. */
  email: "support@getqvi.com",
  locale: "en",
} as const;
