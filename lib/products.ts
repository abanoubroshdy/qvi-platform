export const products = {
  qv1: {
    slug: "qv1",
    name: "QV1",
    href: "/products/qv1",
    status: "Evaluation",
    title: "QV1 - 4 AI stems, Drum Split (DSP) in Pro",
    description:
      "Free Windows evaluation: 4 AI stems (vocals, drums, bass, other) with non-commercial third-party models. Drum Split (DSP) is Pro, coming soon.",
    features: [
      "4 AI stems — vocals, drums, bass, and other — free in QV1 Evaluation",
      "Drum Split (DSP): Kick, Snare, Hi-hat, and Other Drums — Pro, coming soon, on any drum track",
      "Audio stays on your PC. Models download only after a non-commercial notice",
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
  studio: {
    slug: "qvi-studio",
    name: "QVI Studio",
    href: "/studio",
    workspaceHref: "/studio",
    status: "On this device",
    title: "Miniature multitrack studio",
    description: "Import tracks, set volume, tempo, and pitch, and play the mix on this device.",
    features: [
      "Arrange clips on a shared timeline",
      "Mix volume, mute, and solo per track",
      "Change tempo and pitch without leaving the session",
    ],
  },
} as const;

/** Waitlist products. QVI Studio is live on the site and does not take a waitlist. */
export type ProductKey = Exclude<keyof typeof products, "studio">;
