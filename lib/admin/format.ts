export function formatAdminDateTime(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}