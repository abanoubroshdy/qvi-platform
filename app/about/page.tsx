import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "QVI - Quality Virtual Instruments builds intelligent audio software that runs on your device, plus free local browser utilities.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <LegalPage title="About QVI" updatedAt="September 13, 2026">
      <p>
        QVI (Quality Virtual Instruments) is an audio software studio. We build intelligent
        instruments and processors designed to run on your device — not a generic dump of online
        gadgets with a logo on top.
      </p>
      <h2 className="text-xl font-bold">The ecosystem</h2>
      <p>
        <Link href="/products/qv1" className="font-semibold text-primary hover:underline">
          QV1
        </Link>{" "}
        is our stem separation and audio processing engine.{" "}
        <Link href="/products/neyora" className="font-semibold text-primary hover:underline">
          Neyora
        </Link>{" "}
        is the lab instrument: DDSP synthesis from text, voice, or MIDI. Around them we ship free
        browser utilities that process files locally, so the platform is useful while the flagship
        engines mature.
      </p>
      <h2 className="text-xl font-bold">On-device by default</h2>
      <p>
        Audio and documents are intimate. Wherever we can keep processing on the machine in front of
        you, we will. Free tools on this site already work that way: no upload API, no account wall.
      </p>
      <h2 className="text-xl font-bold">Ads and sustainability</h2>
      <p>
        Free utilities may show advertising to cover hosting. Ads are not a license to harvest your
        sessions. Read the{" "}
        <Link href="/privacy-policy" className="font-semibold text-primary hover:underline">
          Privacy Policy
        </Link>{" "}
        for details.
      </p>
      <h2 className="text-xl font-bold">Contact</h2>
      <p>
        For press, waitlist questions, or product feedback, use{" "}
        <Link href="/contact" className="font-semibold text-primary hover:underline">
          Contact
        </Link>{" "}
        or {siteConfig.email}.
      </p>
    </LegalPage>
  );
}
