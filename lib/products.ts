export const products = {
  qv1: {
    slug: "qv1",
    name: "QV1",
    href: "/products/qv1",
    status: "Coming Soon",
    title: "QV1 - Stem Separation & Audio Processing Engine",
    description:
      "Professional AI engine for vocal/instrumental separation and track processing.",
    features: [
      "Split mixed tracks into vocals, instruments, and supporting stems",
      "Clean noise and artifacts without hollowing the source",
      "Rebuild balance for remix, sample, and scoring workflows",
    ],
  },
  neyora: {
    slug: "neyora",
    name: "Neyora",
    href: "/products/neyora",
    status: "In Development",
    title: "Neyora - DDSP Instrument Synthesis",
    description:
      "Transform text, voice, or MIDI into realistic instrument performance using DDSP technology.",
    features: [
      "Prompt an instrument performance from text or sung input",
      "Map MIDI into expressive, physically informed timbre",
      "Designed for composers who want studio-ready phrases, not generic loops",
    ],
  },
} as const;

export type ProductKey = keyof typeof products;
