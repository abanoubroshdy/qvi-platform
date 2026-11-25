import type { Locale } from "@/lib/i18n";
import { resolveContactFromEmail } from "@/lib/contact";

export type LicenseKeyEmailInput = {
  to: string;
  productName: string;
  licenseKeyFormatted: string;
  locale?: Locale;
};

function buildLicenseKeyEmail(input: LicenseKeyEmailInput): { subject: string; html: string; text: string } {
  const locale = input.locale === "ar" ? "ar" : "en";
  if (locale === "ar") {
    return {
      subject: `مفتاح ترخيص ${input.productName} — QVI`,
      text: [
        "مرحبًا،",
        "",
        `إليك مفتاح ترخيص ${input.productName}:`,
        input.licenseKeyFormatted,
        "",
        "احتفظ به في مكان آمن. يمكنك تفعيل التطبيق باستخدامه على getqvi.com.",
      ].join("\n"),
      html: `<!DOCTYPE html><html dir="rtl" lang="ar"><body style="font-family:sans-serif;line-height:1.6">
        <p>مرحبًا،</p>
        <p>إليك مفتاح ترخيص <strong>${escapeHtml(input.productName)}</strong>:</p>
        <p style="font-family:monospace;font-size:18px;letter-spacing:0.1em;direction:ltr;text-align:center;padding:12px;background:#f4f4f5;border-radius:8px">${escapeHtml(input.licenseKeyFormatted)}</p>
        <p>احتفظ به في مكان آمن. يمكنك تفعيل التطبيق باستخدامه.</p>
      </body></html>`,
    };
  }

  return {
    subject: `Your ${input.productName} license key — QVI`,
    text: [
      "Hello,",
      "",
      `Here is your ${input.productName} license key:`,
      input.licenseKeyFormatted,
      "",
      "Store it somewhere safe. Use it to activate your app.",
    ].join("\n"),
    html: `<!DOCTYPE html><html lang="en"><body style="font-family:sans-serif;line-height:1.6">
      <p>Hello,</p>
      <p>Here is your <strong>${escapeHtml(input.productName)}</strong> license key:</p>
      <p style="font-family:monospace;font-size:18px;letter-spacing:0.1em;padding:12px;background:#f4f4f5;border-radius:8px">${escapeHtml(input.licenseKeyFormatted)}</p>
      <p>Store it somewhere safe. Use it to activate your app.</p>
    </body></html>`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendLicenseKeyEmail(
  input: LicenseKeyEmailInput,
): Promise<{ ok: true } | { ok: false; reason: "not_configured" | "provider_error" }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveContactFromEmail() ?? "QVI <noreply@getqvi.com>";
  if (!apiKey) return { ok: false, reason: "not_configured" };

  const { subject, html, text } = buildLicenseKeyEmail(input);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to.trim()],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) return { ok: false, reason: "provider_error" };
  return { ok: true };
}