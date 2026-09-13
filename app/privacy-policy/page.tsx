import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for QVI - Quality Virtual Instruments: on-device processing, cookies, and advertising.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updatedAt="September 13, 2026">
      <p>
        This policy explains how QVI ({siteConfig.url}) handles information when you visit the site,
        join a waitlist, or use free browser tools. If you do not agree, please stop using the
        service.
      </p>
      <h2 className="text-xl font-bold">1. On-device processing</h2>
      <p>
        Free utilities such as image compression, WEBP conversion, PNG to PDF, and QR generation run
        in your browser. We do not require an account and we do not upload those files to our
        servers to process them. Flagship products (QV1, Neyora) are being designed around the same
        principle: keep source audio on your machine whenever possible.
      </p>
      <p>
        We do not use the contents of files you process in the browser to train models or to build
        advertising profiles tied to that content.
      </p>
      <h2 className="text-xl font-bold">2. Technical logs</h2>
      <p>
        Hosting providers may record limited technical data to keep the site up: approximate IP,
        browser type, time, and the page requested. Those logs do not include the files you process
        locally.
      </p>
      <h2 className="text-xl font-bold">3. Cookies and ads</h2>
      <p>
        The site may use cookies required to run the page, plus third-party cookies for advertising
        and traffic measurement, including Google AdSense. You can limit personalized ads in Google
        Ads settings. Blocking non-essential cookies may change ad display; it will not stop local
        tools from working.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Google ad settings:{" "}
          <a className="text-primary hover:underline" href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">
            adssettings.google.com
          </a>
        </li>
        <li>
          Google advertising technologies:{" "}
          <a
            className="text-primary hover:underline"
            href="https://policies.google.com/technologies/ads"
            rel="noopener noreferrer"
            target="_blank"
          >
            policies.google.com/technologies/ads
          </a>
        </li>
      </ul>
      <h2 className="text-xl font-bold">4. Waitlists and contact</h2>
      <p>
        Product waitlists on this site currently store your email in this browser via local storage
        until a server waitlist (for example Supabase) is connected. Messages you send through the
        contact form go to {siteConfig.email} and are used only to reply.
      </p>
      <h2 className="text-xl font-bold">5. Children</h2>
      <p>
        The site is for a general audience. We do not knowingly collect personal information from
        children under 13. Contact us if you believe a child submitted data so we can delete it.
      </p>
      <h2 className="text-xl font-bold">6. Changes</h2>
      <p>
        We may update this policy as products ship. The date at the top will change. Continued use
        after an update means you accept the revised policy.
      </p>
      <h2 className="text-xl font-bold">7. Contact</h2>
      <p>
        Privacy questions: {siteConfig.email} or the{" "}
        <Link href="/contact" className="font-semibold text-primary hover:underline">
          contact page
        </Link>
        .
      </p>
    </LegalPage>
  );
}
