export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 بايت";
  if (bytes < 1024) return `${bytes} بايت`;

  const units = ["ك.ب", "م.ب", "ج.ب"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}٪`;
}
