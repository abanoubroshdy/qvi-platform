import Link from "next/link";
import { Logo } from "@/components/Logo";
import { siteConfig } from "@/lib/site";

const productLinks = [
  { href: "/products/qv1", label: "QV1" },
  { href: "/products/neyora", label: "Neyora Lab" },
];

const legalLinks = [
  { href: "/about", label: "About" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="qvi-footer mt-auto border-t border-white/10 bg-black/30">
      <div className="qvi-footer-inner mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-2">
          <Logo />
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            {siteConfig.fullName}. {siteConfig.tagline}. Intelligent audio software that runs on your
            device, plus free browser utilities that never upload your files.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-foreground">Products</h2>
          <ul className="space-y-2 text-sm">
            {productLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-muted-foreground transition hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/#tools" className="text-muted-foreground transition hover:text-primary">
                Free Tools
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-foreground">Company</h2>
          <ul className="space-y-2 text-sm">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-muted-foreground transition hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground sm:text-left">
          © {year} {siteConfig.fullName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
