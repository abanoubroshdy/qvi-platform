import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact QVI about QV1, Neyora, waitlists, privacy, or the free tools.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <LegalPage title="Contact" updatedAt="September 13, 2026">
      <p>
        For product questions, waitlist issues, press, or a bug in a free tool, write through the
        form or email us directly. We reply on business days when we can.
      </p>
      <div className="rounded-xl border border-white/10 bg-muted/40 p-4 text-sm">
        <p>
          Email:{" "}
          <a className="font-semibold text-primary hover:underline" href={`mailto:${siteConfig.email}`}>
            {siteConfig.email}
          </a>
        </p>
        <p className="mt-2 text-muted-foreground">
          Do not send session files or private stems over email. Support is for text. Local tools
          already process files on your device.
        </p>
      </div>
      <h2 className="text-xl font-bold">Message</h2>
      <ContactForm />
    </LegalPage>
  );
}
