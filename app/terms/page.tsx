import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for the QVI platform, products, and free browser tools.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updatedAt="September 13, 2026">
      <p>
        These terms govern your use of QVI - Quality Virtual Instruments ({siteConfig.name}),
        including product pages and free utilities. Entering the site or using a tool means you
        agree to these terms and the{" "}
        <Link href="/privacy-policy" className="font-semibold text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
      <h2 className="text-xl font-bold">1. The service</h2>
      <p>
        QVI provides information about upcoming audio software (including QV1 and Neyora) and free
        in-browser utilities. Waitlists, demos, and &quot;coming soon&quot; labels are not a promise
        of a ship date. The site is provided as-is.
      </p>
      <h2 className="text-xl font-bold">2. Your files</h2>
      <p>
        You are responsible for the files and text you process. You must have the right to use that
        content. Do not use the tools to violate the law or other people&apos;s rights. Local tools
        do not keep a copy after you close the tab.
      </p>
      <h2 className="text-xl font-bold">3. Acceptable use</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Do not attack, scrape abusively, or disrupt the site.</li>
        <li>Do not resell the service as your own product without written permission.</li>
        <li>Do not submit malware or use contact forms for spam or fraud.</li>
      </ul>
      <h2 className="text-xl font-bold">4. Intellectual property</h2>
      <p>
        The QVI name, product names (QV1, Neyora), logo, and original copy belong to the project
        unless stated otherwise. Open-source libraries keep their own licenses. Content you process
        remains yours.
      </p>
      <h2 className="text-xl font-bold">5. Ads and outbound links</h2>
      <p>
        We may show ads (including Google AdSense) and links to other sites. We do not control those
        third parties.
      </p>
      <h2 className="text-xl font-bold">6. Disclaimer</h2>
      <p>
        To the fullest extent allowed by law, QVI is not liable for damages from using the tools,
        from downtime, or from losing a file you did not back up. Keep originals before converting
        or compressing anything.
      </p>
      <h2 className="text-xl font-bold">7. Contact</h2>
      <p>
        Questions: {siteConfig.email} or{" "}
        <Link href="/contact" className="font-semibold text-primary hover:underline">
          Contact
        </Link>
        .
      </p>
    </LegalPage>
  );
}
