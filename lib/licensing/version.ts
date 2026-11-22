export function parseVersionParts(version: string): number[] {
  const core = version.split(/[+_-]/)[0] ?? version;
  return core
    .split(".")
    .map((part) => parseInt(part.replace(/\D/g, "") || "0", 10))
    .slice(0, 4);
}

export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersionParts(latest);
  const b = parseVersionParts(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return false;
}