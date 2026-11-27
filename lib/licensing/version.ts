export type ParsedSemver = {
  major: number;
  minor: number;
  patch: number;
  /** `null` means a stable release (no pre-release segment). */
  prerelease: string[] | null;
};

function compareIdentifier(a: string, b: string): number {
  const aNum = /^\d+$/.test(a) ? Number.parseInt(a, 10) : null;
  const bNum = /^\d+$/.test(b) ? Number.parseInt(b, 10) : null;
  if (aNum !== null && bNum !== null) {
    if (aNum !== bNum) return aNum < bNum ? -1 : 1;
    return 0;
  }
  if (aNum !== null && bNum === null) return -1;
  if (aNum === null && bNum !== null) return 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function comparePrerelease(a: string[] | null, b: string[] | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const av = a[i];
    const bv = b[i];
    if (av === undefined) return -1;
    if (bv === undefined) return 1;
    const cmp = compareIdentifier(av, bv);
    if (cmp !== 0) return cmp;
  }
  return 0;
}

export function parseSemver(version: string): ParsedSemver {
  const withoutBuild = version.split("+")[0] ?? version;
  const dashIdx = withoutBuild.indexOf("-");
  const core = dashIdx === -1 ? withoutBuild : withoutBuild.slice(0, dashIdx);
  const preSegment = dashIdx === -1 ? null : withoutBuild.slice(dashIdx + 1);

  const parts = core.split(".");
  const major = Number.parseInt(parts[0]?.replace(/\D/g, "") || "0", 10) || 0;
  const minor = Number.parseInt(parts[1]?.replace(/\D/g, "") || "0", 10) || 0;
  const patch = Number.parseInt(parts[2]?.replace(/\D/g, "") || "0", 10) || 0;

  const prerelease =
    preSegment === null || preSegment.length === 0 ? null : preSegment.split(".");

  return { major, minor, patch, prerelease };
}

/** @deprecated Prefer `parseSemver` — kept for callers that only need numeric core segments. */
export function parseVersionParts(version: string): number[] {
  const { major, minor, patch } = parseSemver(version);
  return [major, minor, patch];
}

export function compareVersions(latest: string, current: string): number {
  const a = parseSemver(latest);
  const b = parseSemver(current);
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  return comparePrerelease(a.prerelease, b.prerelease);
}

export function isNewerVersion(latest: string, current: string): boolean {
  return compareVersions(latest, current) > 0;
}