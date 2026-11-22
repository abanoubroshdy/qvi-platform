/** Lowercase hostnames (no leading dots). */
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "0-mail.com",
  "0815.ru",
  "10minutemail.com",
  "10minutemail.net",
  "10minmail.com",
  "10minutesmail.com",
  "20minutemail.com",
  "33mail.com",
  "anonbox.net",
  "art2mart.com",
  "binkmail.com",
  "bobmail.info",
  "burnermail.io",
  "byom.de",
  "deadaddress.com",
  "discard.email",
  "discardmail.com",
  "disposablemail.com",
  "dropmail.me",
  "emailondeck.com",
  "emailtmp.com",
  "example.invalid",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "harakirimail.com",
  "incognitomail.com",
  "incognitomail.org",
  "jetable.org",
  "mail-temp.com",
  "mail.tm",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailinator.org",
  "mailinator2.com",
  "mailnesia.com",
  "mailnull.com",
  "mailscrap.com",
  "mintemail.com",
  "moakt.com",
  "mytemp.email",
  "nowhere.org",
  "sharklasers.com",
  "spam4.me",
  "spamgourmet.com",
  "temp-mail.org",
  "temp-mail.ru",
  "tempmail.com",
  "tempmail.net",
  "tempmailo.com",
  "temporary-mail.net",
  "throwaway.email",
  "trashmail.com",
  "trashmail.net",
  "trashmail.org",
  "trashymail.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "zippymail.info",
]);

/** Common typos → suggested domain (display only). */
const DOMAIN_TYPO_SUGGESTIONS: Record<string, string> = {
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gnail.com": "gmail.com",
  "hotmal.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahho.com": "yahoo.com",
};

export type SignupEmailAssessment =
  | { ok: true }
  | { ok: false; code: "disposable_email"; domain: string }
  | { ok: false; code: "email_typo"; domain: string; suggestion: string };

function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || !domain.includes(".")) return null;
  return domain;
}

export function isDisposableEmailDomain(domain: string): boolean {
  const host = domain.trim().toLowerCase();
  if (!host) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(host)) return true;
  const parts = host.split(".");
  while (parts.length > 2) {
    parts.shift();
    if (DISPOSABLE_EMAIL_DOMAINS.has(parts.join("."))) return true;
  }
  return false;
}

export function assessSignupEmail(email: string): SignupEmailAssessment {
  const normalized = email.trim().toLowerCase();
  const domain = emailDomain(normalized);
  if (!domain) return { ok: true };

  if (isDisposableEmailDomain(domain)) {
    return { ok: false, code: "disposable_email", domain };
  }

  const suggestion = DOMAIN_TYPO_SUGGESTIONS[domain];
  if (suggestion) {
    return { ok: false, code: "email_typo", domain, suggestion };
  }

  return { ok: true };
}

/** Client-side hint for inline validation (same rules as server). */
export function signupEmailIssue(email: string): SignupEmailAssessment | null {
  const result = assessSignupEmail(email);
  return result.ok ? null : result;
}