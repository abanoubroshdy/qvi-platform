export type PdfDir = "ltr" | "rtl";

export type PdfSpan = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  color: string;
  dir: PdfDir;
};

export type PdfImageRef = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextRunModel = {
  kind: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  color: string;
  rtl: boolean;
};

export type ImageRunModel = {
  kind: "image";
  imageIndex: number;
  widthPx: number;
  heightPx: number;
};

export type RunModel = TextRunModel | ImageRunModel;

export type TextBlock = {
  type: "text";
  alignment: "left" | "center" | "right" | "both";
  rtl: boolean;
  indentTwips: number;
  firstLineTwips: number;
  spaceBeforeTwips: number;
  spaceAfterTwips: number;
  lineTwips: number;
  runs: RunModel[];
};

export type ImageBlock = {
  type: "image";
  imageIndex: number;
  spaceBeforeTwips: number;
  widthPx: number;
  heightPx: number;
};

export type TableCellModel = {
  runs: RunModel[];
  rtl: boolean;
  alignment: TextBlock["alignment"];
};

/** Multi-cell row: Phase 2 column gutters (borderless) or Phase 3 form grids (bordered). */
export type TableBlock = {
  type: "table";
  rows: TableCellModel[][];
  spaceBeforeTwips: number;
  /** When false, Word cells render without visible borders (column grid). */
  borders: boolean;
  /** `form` = checkbox/option grids; `columns` = wide-gutter layout only. */
  role: "columns" | "form";
};

export type LayoutBlock = TextBlock | ImageBlock | TableBlock;

export type PageLayout = {
  widthPt: number;
  heightPt: number;
  margin: { top: number; right: number; bottom: number; left: number };
  blocks: LayoutBlock[];
  useVisualFallback: boolean;
  /**
   * Phase 4 — keep editable blocks and also attach a rendered page preview
   * so complex forms / mixed art can be visually verified in Word.
   */
  includeVisualReference: boolean;
  /** Why hybrid was chosen (empty when not hybrid). */
  hybridReason: string;
  wordCount: number;
  imageCount: number;
  /** Number of table blocks (column grids + form tables). */
  tableCount: number;
  /** Subset of tableCount with role === "form" (checkbox / option grids). */
  formTableCount: number;
};

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const HEBREW_RE = /[\u0590-\u05FF]/;
const LATIN_RE = /[A-Za-z]/;
/** Illegal in XML 1.0 text nodes — Word Mobile often refuses to open the file. */
const XML_ILLEGAL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const BIDI_MARKS_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
/**
 * Custom PDF fonts often mis-map Arabic glyphs onto Canadian Aboriginal Syllabics
 * (U+1400+) and Armenian (U+0530+). Those code points are never real Arabic text.
 */
const FONT_GARBAGE_RE = /[\u0530-\u058F\u1400-\u167F\u18B0-\u18FF\uA000-\uA48F]/g;
const ARABIC_FONT = "Tahoma";

const FAMILY_ALIASES: Array<[RegExp, string]> = [
  [/times/i, "Times New Roman"],
  [/helvetica/i, "Helvetica"],
  [/courier/i, "Courier New"],
  [/arial/i, "Arial"],
  [/calibri/i, "Calibri"],
  [/cambria/i, "Cambria"],
  [/georgia/i, "Georgia"],
  [/verdana/i, "Verdana"],
  [/tahoma/i, "Tahoma"],
  [/segoe/i, "Segoe UI"],
  [/garamond/i, "Garamond"],
  [/palatino/i, "Palatino Linotype"],
  [/symbol/i, "Symbol"],
  [/wingdings?/i, "Wingdings"],
  [/comic/i, "Comic Sans MS"],
  [/trebuchet/i, "Trebuchet MS"],
  [/naskh|traditional.?arabic|simplified.?arabic/i, "Tahoma"],
  [/noto\s*sans/i, "Noto Sans"],
  [/noto\s*serif/i, "Noto Serif"],
  [/roboto/i, "Roboto"],
  [/dejavu/i, "Arial"],
];

export function pointsToTwips(points: number) {
  return Math.max(0, Math.round(points * 20));
}

/**
 * Phase 6 — keep small line gaps, heavily dampen large PDF voids so Word
 * pages do not look mostly blank (previous hard cap was a full inch / 1440).
 */
export function compressSpaceBeforeTwips(spaceBeforePoints: number) {
  const raw = pointsToTwips(spaceBeforePoints);
  if (raw <= 0) return 0;
  if (raw <= 120) return raw;
  const dampened = 120 + Math.round((raw - 120) * 0.25);
  return Math.min(360, dampened);
}

/**
 * True when a block has no letters/digits — only whitespace, checkboxes,
 * colons, or separator punctuation left after broken-font cleanup.
 */
export function isEmptyishBlockText(text: string) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return true;
  return !/[A-Za-z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    trimmed,
  );
}

export function runsPlainText(runs: RunModel[]) {
  return runs.map((run) => (run.kind === "text" ? run.text : "")).join("");
}

export function pointsToPx(points: number) {
  return Math.max(1, Math.round((points * 96) / 72));
}

export function pointsToHalfPoints(points: number) {
  return Math.max(8, Math.min(144, Math.round(points * 2)));
}

export function rgbToHex(r: number, g: number, b: number) {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return [clamp(r), clamp(g), clamp(b)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function cmykToHex(c: number, m: number, y: number, k: number) {
  const toRgb = (channel: number) => 255 * (1 - channel) * (1 - k);
  return rgbToHex(toRgb(c), toRgb(m), toRgb(y));
}

export function grayToHex(gray: number) {
  const value = gray * 255;
  return rgbToHex(value, value, value);
}

export function isRtlText(text: string) {
  let rtl = 0;
  let ltr = 0;
  for (const char of text) {
    if (ARABIC_RE.test(char) || HEBREW_RE.test(char)) rtl += 1;
    else if (LATIN_RE.test(char)) ltr += 1;
  }
  return rtl > 0 && rtl >= ltr;
}

/** Strip XML-illegal controls and bidi isolates that break Word / confuse shaping. */
export function sanitizeXmlText(text: string) {
  return text.replace(XML_ILLEGAL_RE, "").replace(BIDI_MARKS_RE, "");
}

function stripFontGarbage(text: string) {
  // These ranges are almost always broken ToUnicode mappings from custom Arabic fonts.
  return text.replace(FONT_GARBAGE_RE, "");
}

/** Reverse contiguous Arabic/Hebrew character runs (visual → logical). */
export function reverseArabicRuns(text: string) {
  let output = "";
  let buffer = "";
  const flush = () => {
    if (!buffer) return;
    output += Array.from(buffer).reverse().join("");
    buffer = "";
  };
  for (const char of text) {
    if (ARABIC_RE.test(char) || HEBREW_RE.test(char) || /[\u064B-\u065F\u0670]/.test(char)) {
      buffer += char;
      continue;
    }
    // Keep Arabic punctuation/spaces inside the run so whole phrases reverse together.
    if (buffer && /[\s\u060C\u061B\u061F\u066A-\u066D،؛؟]/.test(char)) {
      buffer += char;
      continue;
    }
    flush();
    output += char;
  }
  flush();
  return output;
}

/**
 * Detect Arabic stored in visual order (rightmost letter first in the string).
 * Logical Arabic usually starts words with ال/وال؛ visual order ends those words with لا.
 */
export function looksVisuallyOrderedArabic(text: string) {
  const words = text
    .split(/\s+/)
    .map((word) => word.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, ""))
    .filter((word) => word.length >= 3);
  if (!words.length) return false;
  let visual = 0;
  let logical = 0;
  for (const word of words) {
    if (/^(ال|وال|بال|كال|فال)/.test(word)) logical += 1;
    if (/(لا|لاو|لاب|لاك)$/.test(word)) visual += 1;
    if (word.startsWith("ة") || word.startsWith("ى")) visual += 1;
    if (word.endsWith("ة") || word.endsWith("ى")) logical += 1;
  }
  return visual > logical;
}

/**
 * Broken fonts often emit the same Arabic phrase twice (sometimes overlapping after
 * reverse). Keep the longest distinct Arabic sentence-like span.
 */
function dedupeRepeatedArabic(text: string) {
  if (!ARABIC_RE.test(text)) return text;

  const starters = ["نموذج", "معايير", "القسم", "البيانات", "عنصر", "صفحة"];
  for (const start of starters) {
    const indexes: number[] = [];
    let from = 0;
    while (from < text.length) {
      const index = text.indexOf(start, from);
      if (index < 0) break;
      indexes.push(index);
      from = index + start.length;
    }
    if (indexes.length < 2) continue;
    const first = indexes[0]!;
    const second = indexes[1]!;
    const firstChunk = text.slice(first, second).replace(/\s+/g, " ").trim();
    const lastChunk = text.slice(indexes[indexes.length - 1]!).replace(/\s+/g, " ").trim();
    const keep = lastChunk.length >= firstChunk.length * 0.75 ? lastChunk : firstChunk;
    const prefix = text
      .slice(0, first)
      .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const suffixLatin = text
      .slice(second + keep.length)
      .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Prefer content after the first chunk for trailing Latin on the original line.
    const trailing = text
      .slice(indexes[indexes.length - 1]! + keep.length)
      .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return [prefix, keep, trailing || suffixLatin].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  // Collapse near-duplicate full phrases glued without a clear starter.
  const phraseRe = /[\u0600-\u06FF][\u0600-\u06FF\s]{6,}[\u0600-\u06FF]/g;
  const phrases = text.match(phraseRe) ?? [];
  if (phrases.length >= 2) {
    const cleaned = phrases.map((phrase) => phrase.replace(/\s+/g, " ").trim());
    const longest = cleaned.reduce((a, b) => (a.length >= b.length ? a : b));
    const similar = cleaned.filter((phrase) => {
      const a = phrase.replace(/\s+/g, "");
      const b = longest.replace(/\s+/g, "");
      return a === b || a.includes(b) || b.includes(a) || overlapRatio(a, b) >= 0.7;
    });
    if (similar.length >= 2) {
      const latin = text
        .replace(phraseRe, " ")
        .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return latin ? `${longest} ${latin}`.replace(/\s+/g, " ").trim() : longest;
    }
  }

  return text.replace(/\s{2,}/g, " ").trim();
}

function overlapRatio(a: string, b: string) {
  if (!a || !b) return 0;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.includes(short)) return short.length / long.length;
  let best = 0;
  for (let len = short.length; len >= Math.floor(short.length * 0.5); len -= 1) {
    for (let i = 0; i + len <= short.length; i += 1) {
      if (long.includes(short.slice(i, i + len))) {
        best = Math.max(best, len / long.length);
      }
    }
    if (best >= 0.7) break;
  }
  return best;
}

/**
 * Broken ToUnicode maps often replace the first Latin letter with a digit/symbol
 * (%asic→Basic, 7echnical→Technical, 0etronome→Metronome). Tail → correct word.
 */
const CORRUPT_LATIN_TAILS: Record<string, string> = {
  asic: "Basic",
  echnical: "Technical",
  reath: "Breath",
  hythm: "Rhythm",
  etronome: "Metronome",
  iming: "Timing",
  iano: "Piano",
  orte: "Forte",
  imbre: "Timbre",
  asp: "Rasp",
  essitura: "Tessitura",
  ange: "Range",
  reakpoints: "Breakpoints",
  ixed: "Mixed",
  ype: "Type",
  ass: "Bass",
  aritone: "Baritone",
  enor: "Tenor",
  lto: "Alto",
  ezzo: "Mezzo",
  iagnosis: "Diagnosis",
  lending: "Blending",
  raining: "Training",
  itch: "Pitch",
  owest: "Lowest",
  ighest: "Highest",
  one: "Tone",
  ntonation: "Intonation",
};

/**
 * Phase 1 — repair Latin first-letter corruption and glued English label echoes
 * left after broken-font Arabic recovery (e.g. Basic Information)%asic Information()).
 */
export function repairLatinCorruption(text: string) {
  if (!text) return text;

  // %asic / ).)orte / .,)ntonation — junk prefix + lowercase tail from the dictionary.
  let next = text.replace(
    /(^|[^A-Za-z])([^A-Za-z]*?)([a-z]{2,})((?:-[A-Za-z]+)*)/g,
    (full, boundary: string, junk: string, tail: string, suffix: string) => {
      if (!junk) return full;
      const fixed = CORRUPT_LATIN_TAILS[tail.toLowerCase()];
      if (!fixed) return full;
      return `${boundary}${fixed}${suffix ?? ""}`;
    },
  );

  // Echo glued with junk: Intonation).Intonation / Basic Basic
  next = next.replace(/\b([A-Za-z][A-Za-z'-]{1,24})[^A-Za-z\n]{1,6}\1\b/gi, "$1");
  next = next.replace(/\b([A-Za-z][A-Za-z'-]{1,24})\s+\1\b/gi, "$1");

  // Basic Information)Basic Information( → Basic Information
  next = next.replace(/\b([A-Za-z][A-Za-z0-9 /&'-]{0,40}?)\)\s*\1\s*\(/gi, "$1");

  // Basic Information)Technical Assessment( / Basic Information)1-5(
  next = next.replace(
    /\b([A-Za-z][A-Za-z0-9 /&'-]{0,40}?)\)\s*([A-Za-z0-9][A-Za-z0-9 /&'.-]{0,40}?)\s*\(/g,
    "$1 ($2)",
  );

  // Score index glued onto the next English heading: .1)Basic Information
  next = next.replace(/(\d)\)\s*([A-Za-z])/g, "$1 $2");
  // Arabic/label)EnglishHeading leftovers after paren-strip
  next = next.replace(/\)\s*([A-Za-z])/g, " $1");
  // Leading .) or ). junk before Latin labels
  next = next.replace(/(^|\s)[.)]{1,3}(?=[A-Za-z])/g, "$1");
  next = next.replace(/(^|\n)\.\s+(?=[A-Za-z])/g, "$1");

  // Dangling open-parens used as PDF label separators: Pitch( الأذن → Pitch الأذن
  next = next.replace(/\(\s*\)/g, "");
  next = next.replace(/\b([A-Za-z][A-Za-z'-]*)\(/g, "$1");
  // Unclosed "(Intonation" after echo collapse
  next = next.replace(/\(([A-Za-z][A-Za-z' -]*)$/g, "$1");
  next = next.replace(/([\u0600-\u06FF])\(/g, "$1 (");
  next = next.replace(/([\u0600-\u06FF])([A-Za-z])/g, "$1 $2");
  next = next.replace(/([A-Za-z])([\u0600-\u06FF])/g, "$1 $2");
  next = next.replace(/(^|\s)\)+[.,]*/g, "$1");
  next = next.replace(/[.,]{2,}/g, ".");

  // Arabic: space after colon between letters; digit spacing in "من1"
  next = next.replace(/([\u0600-\u06FF]):([\u0600-\u06FF])/g, "$1: $2");
  next = next.replace(/([\u0600-\u06FF])(\d)/g, "$1 $2");
  next = next.replace(/(\d)([\u0600-\u06FF])/g, "$1 $2");

  return next.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Normalize + repair PDF text for editable Word output.
 * - NFKC maps Arabic presentation forms to base letters
 * - Strip XML-illegal controls (Word Desktop/Mobile refuse the file otherwise)
 * - Drop mis-decoded Canadian Aboriginal / Armenian glyphs from broken fonts
 * - Reverse visual-order Arabic into logical order when detected
 * - Repair Latin first-letter corruption and English label echoes (Phase 1)
 */
export function normalizePdfText(text: string, dir: PdfDir = "ltr") {
  void dir;
  const normalized = typeof text.normalize === "function" ? text.normalize("NFKC") : text;
  const hadGarbage = FONT_GARBAGE_RE.test(normalized) || XML_ILLEGAL_RE.test(normalized);
  let next = sanitizeXmlText(normalized);
  next = stripFontGarbage(next);
  next = next.replace(/\u00A0/g, " ");

  if (ARABIC_RE.test(next) && (hadGarbage || looksVisuallyOrderedArabic(next))) {
    next = reverseArabicRuns(next);
  }
  next = dedupeRepeatedArabic(next);
  next = repairLatinCorruption(next);
  // Drop leftover private-use / odd symbols that survive without Arabic neighbors.
  next = next.replace(/[\uE000-\uF8FF]/g, "");
  return next.replace(/[ \t]{2,}/g, " ").trim();
}

export function fontForRun(family: string, text: string, rtl: boolean) {
  if (rtl || ARABIC_RE.test(text) || HEBREW_RE.test(text)) {
    if (/arial|tahoma|segoe|noto|times|calibri|traditional|simplified|naskh/i.test(family)) {
      return family;
    }
    return ARABIC_FONT;
  }
  return family || "Arial";
}

export function parsePdfFont(fontName: string): { family: string; bold: boolean; italic: boolean } {
  const cleaned = fontName.replace(/^[A-Z0-9]{4,}\+/, "").replace(/^g_[a-z0-9]+_/i, "");
  const lower = cleaned.toLowerCase();
  const bold = /(bold|black|heavy|semibold|demibold|extrabold|ultra|fw[_-]?7|fw[_-]?8|fw[_-]?9)/i.test(lower);
  const italic = /(italic|oblique)/i.test(lower);
  const family = cleaned
    .replace(/[-_,]?(Bold|Italic|Oblique|Regular|Medium|Light|Black|Heavy|SemiBold|DemiBold|ExtraBold|Ultra|Roman|MT|PS|W[0-9]+|BoldMT|ItalicMT)+/gi, " ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, mapped] of FAMILY_ALIASES) {
    if (pattern.test(cleaned) || pattern.test(family)) {
      return { family: mapped, bold, italic };
    }
  }

  if (!family || /^f\d+$/i.test(family) || family.length < 2) {
    return { family: "Arial", bold, italic };
  }

  return { family, bold, italic };
}

export function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function fontSizeFromTransform(transform: number[]) {
  const a = transform[0] ?? 0;
  const b = transform[1] ?? 0;
  const scale = Math.hypot(a, b);
  if (scale > 0.5) return scale;
  const d = Math.abs(transform[3] ?? 0);
  return d > 0.5 ? d : 12;
}

type Line = {
  baseline: number;
  x: number;
  width: number;
  fontSize: number;
  rtl: boolean;
  items: Array<{ kind: "text"; span: PdfSpan } | { kind: "image"; imageIndex: number; x: number; width: number; height: number }>;
};

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const left = sorted[mid - 1] ?? sorted[mid] ?? 0;
  const right = sorted[mid] ?? left;
  return sorted.length % 2 === 0 ? (left + right) / 2 : right;
}

function sameStyle(a: PdfSpan, b: PdfSpan) {
  return (
    a.fontFamily === b.fontFamily &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.color === b.color &&
    Math.abs(a.fontSize - b.fontSize) < 0.35 &&
    a.dir === b.dir
  );
}

function insertGapText(prev: PdfSpan, next: PdfSpan) {
  // Use geometric distance between boxes — works after RTL (right→left) sorting
  // where next.x - (prev.x + prev.width) is negative.
  const gap = horizontalGap(prev, next);

  if (gap <= Math.max(0.12 * prev.fontSize, 0.4)) return "";
  if (/\s$/.test(prev.text) || /^\s/.test(next.text)) return "";
  // Phase 2: large gaps become column cells instead of tabs. Within a cluster the
  // gap should stay modest; if one slips through, prefer spaces over \t.
  if (gap > Math.max(24, prev.fontSize * 1.8)) return "   ";
  const spaces = Math.max(1, Math.min(6, Math.round(gap / Math.max(prev.fontSize * 0.38, 2))));
  return " ".repeat(spaces);
}

export function columnGapThreshold(fontSize: number) {
  // Stricter than the old tab threshold so in-sentence gaps (mixed AR/EN) stay
  // on one line, while real column gutters (~50pt+) become table cells.
  return Math.max(40, fontSize * 2.6);
}

export function horizontalGap(a: PdfSpan, b: PdfSpan) {
  const aLeft = a.x;
  const aRight = a.x + Math.max(0, a.width);
  const bLeft = b.x;
  const bRight = b.x + Math.max(0, b.width);
  if (bLeft >= aRight) return bLeft - aRight;
  if (aLeft >= bRight) return aLeft - bRight;
  return 0;
}

/**
 * Phase 2 — split a line's spans into left→right column clusters when large
 * horizontal gutters separate them (the same gaps that used to become tabs).
 */
export function splitSpansIntoColumnClusters(spans: PdfSpan[]): PdfSpan[][] {
  const usable = spans.filter((span) => span.text.replace(/\s+/g, "").length > 0);
  if (usable.length < 2) return usable.length ? [usable] : [];

  const ordered = [...usable].sort((a, b) => a.x - b.x || b.width - a.width);
  const clusters: PdfSpan[][] = [[ordered[0]!]];
  for (let index = 1; index < ordered.length; index += 1) {
    const prev = ordered[index - 1]!;
    const next = ordered[index]!;
    const gap = next.x - (prev.x + Math.max(0, prev.width));
    if (gap > columnGapThreshold(Math.max(prev.fontSize, next.fontSize))) {
      clusters.push([next]);
    } else {
      clusters[clusters.length - 1]!.push(next);
    }
  }
  return clusters;
}

const CHECKBOX_RE = /[☐☑☒□■]/;
const FORM_PUNCT_RE = /^[\s:.\-–—|/\\[\]()]+$/;

export function isCheckboxSpan(span: PdfSpan) {
  const compact = span.text.replace(/\s+/g, "");
  return compact.length > 0 && compact.length <= 2 && CHECKBOX_RE.test(compact);
}

function formPairGap(fontSize: number) {
  // Voice-type rows place labels ~45–75pt left of ☐.
  return Math.max(80, fontSize * 5);
}

/**
 * Phase 3 — pair each checkbox with its nearest short label and emit one cell
 * per option (e.g. Tenor☐ | Baritone☐ | Bass☐). Returns null when the line is
 * not a multi-checkbox form row.
 */
export function splitSpansIntoFormCells(spans: PdfSpan[]): PdfSpan[][] | null {
  const usable = spans.filter((span) => span.text.replace(/\s+/g, "").length > 0);
  if (usable.length < 2) return null;

  const ordered = [...usable].sort((a, b) => a.x - b.x || b.width - a.width);
  const checkboxIndexes = ordered
    .map((span, index) => (isCheckboxSpan(span) ? index : -1))
    .filter((index) => index >= 0);
  if (checkboxIndexes.length < 2) return null;

  const used = new Set<number>();
  const cells: PdfSpan[][] = [];

  for (const checkboxIndex of checkboxIndexes) {
    const checkbox = ordered[checkboxIndex]!;
    const maxGap = formPairGap(checkbox.fontSize);
    let labelIndex = -1;

    // Prefer Label ☐ — walk left, skipping bare punctuation.
    for (let index = checkboxIndex - 1; index >= 0; index -= 1) {
      if (used.has(index)) break;
      if (isCheckboxSpan(ordered[index]!)) break;
      const label = ordered[index]!;
      const gap = checkbox.x - (label.x + Math.max(0, label.width));
      if (gap < 0) continue;
      if (FORM_PUNCT_RE.test(label.text)) continue;
      if (gap > maxGap) break;
      if (label.text.replace(/\s+/g, "").length > 48) break;
      labelIndex = index;
      break;
    }

    // ☐ Label only when no left label and the right span is a short option name
    // that is not itself the label for a following checkbox.
    if (labelIndex < 0 && checkboxIndex + 1 < ordered.length && !used.has(checkboxIndex + 1)) {
      const right = ordered[checkboxIndex + 1]!;
      const nextCheckbox = checkboxIndexes.find((index) => index > checkboxIndex);
      if (
        !isCheckboxSpan(right) &&
        !FORM_PUNCT_RE.test(right.text) &&
        right.text.replace(/\s+/g, "").length <= 48 &&
        (nextCheckbox === undefined || nextCheckbox > checkboxIndex + 1)
      ) {
        const gap = right.x - (checkbox.x + Math.max(0, checkbox.width));
        if (gap >= 0 && gap <= Math.max(36, checkbox.fontSize * 3)) {
          labelIndex = checkboxIndex + 1;
        }
      }
    }

    const cell: PdfSpan[] = [];
    if (labelIndex >= 0) {
      if (ordered[labelIndex]!.x <= checkbox.x) cell.push(ordered[labelIndex]!, checkbox);
      else cell.push(checkbox, ordered[labelIndex]!);
      used.add(labelIndex);
    } else {
      cell.push(checkbox);
    }
    used.add(checkboxIndex);
    cells.push(cell);
  }

  const leftover = ordered.filter((_, index) => !used.has(index));
  if (leftover.length) {
    const punct = leftover.filter((span) => FORM_PUNCT_RE.test(span.text));
    const rest = leftover.filter((span) => !FORM_PUNCT_RE.test(span.text));
    if (rest.length) {
      cells.unshift(...splitSpansIntoColumnClusters(rest));
    }
    for (const span of punct) {
      let bestCell = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      cells.forEach((cell, index) => {
        const host = cell[cell.length - 1] ?? cell[0]!;
        const dist = Math.abs(host.x - span.x);
        if (dist < bestDist) {
          bestDist = dist;
          bestCell = index;
        }
      });
      cells[bestCell]!.push(span);
    }
  }

  return cells.length >= 2 ? cells : null;
}

function lineFromCluster(cluster: PdfSpan[], baseline: number, fontSize: number): Line {
  const joined = cluster.map((span) => span.text).join("");
  const rtlVotes = cluster.filter((span) => span.dir === "rtl" || isRtlText(span.text)).length;
  const rtl = isRtlText(joined) || rtlVotes > cluster.length / 2;
  const sorted = [...cluster].sort((a, b) => (rtl ? b.x - a.x || b.width - a.width : a.x - b.x));
  const x = Math.min(...sorted.map((span) => span.x));
  const right = Math.max(...sorted.map((span) => span.x + span.width));
  return {
    baseline,
    x,
    width: right - x,
    fontSize: Math.max(fontSize, ...sorted.map((span) => span.fontSize)),
    rtl,
    items: sorted.map((span) => ({ kind: "text" as const, span })),
  };
}

function lineAlignment(line: Line, pageWidth: number, marginLeft: number, marginRight: number): TextBlock["alignment"] {
  const contentWidth = Math.max(1, pageWidth - marginLeft - marginRight);
  const leftGap = line.x - marginLeft;
  const rightGap = pageWidth - marginRight - (line.x + line.width);
  if (Math.abs(leftGap - rightGap) < 16 && line.width < contentWidth * 0.78 && Math.min(leftGap, rightGap) > 18) {
    return "center";
  }
  if (line.rtl) {
    if (rightGap < 10 && leftGap > 28) return "right";
    return "right";
  }
  if (leftGap < 10 && rightGap > 36) return "left";
  if (rightGap < 10 && leftGap > 36) return "right";
  return line.rtl ? "right" : "left";
}

function isFullPageBackground(image: PdfImageRef, pageWidth: number, pageHeight: number) {
  const area = image.width * image.height;
  const pageArea = pageWidth * pageHeight;
  return area / pageArea > 0.82 && image.width > pageWidth * 0.88 && image.height > pageHeight * 0.88;
}

/**
 * Phase 4 — decide whether an editable page should also carry a visual reference
 * snapshot (mixed art, dense forms, many inline images).
 */
export function pageNeedsHybridVisual(input: {
  textChars: number;
  pageWidth: number;
  pageHeight: number;
  images: PdfImageRef[];
  formTableCount: number;
  tableCount: number;
  checkboxCount: number;
}): { needed: boolean; reason: string } {
  if (input.textChars < 8) return { needed: false, reason: "" };

  const pageArea = Math.max(1, input.pageWidth * input.pageHeight);
  const midImages = input.images.filter((image) => {
    const area = image.width * image.height;
    return area > pageArea * 0.12 && area < pageArea * 0.82;
  });
  if (midImages.length >= 1 && input.textChars >= 40) {
    return { needed: true, reason: "mixed_text_and_art" };
  }

  const smallImages = input.images.filter((image) => {
    const area = image.width * image.height;
    return area >= 24 && area <= pageArea * 0.12;
  });
  if (smallImages.length >= 4 && input.textChars >= 40) {
    return { needed: true, reason: "many_inline_images" };
  }

  if (input.formTableCount >= 2 && input.checkboxCount >= 4) {
    return { needed: true, reason: "dense_form_tables" };
  }

  if (input.tableCount >= 6 && input.textChars >= 80) {
    return { needed: true, reason: "complex_column_grid" };
  }

  return { needed: false, reason: "" };
}

function yTopForSpan(span: PdfSpan, pageHeight: number) {
  return pageHeight - span.y - span.fontSize * 0.85;
}

function yTopForImage(image: PdfImageRef, pageHeight: number) {
  return pageHeight - image.y - image.height;
}

export function groupSpansIntoLines(spans: PdfSpan[]): Line[] {
  const usable = spans.filter((span) => span.text.replace(/\s+/g, "").length > 0);
  // Sort by vertical position only so we do not scramble RTL paint order before
  // line membership is known. Horizontal order is decided per-line below.
  const sorted = [...usable].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Line[] = [];

  for (const span of sorted) {
    const last = lines[lines.length - 1];
    const tolerance = Math.max(2.2, (last?.fontSize ?? span.fontSize) * 0.34);
    if (last && Math.abs(last.baseline - span.y) <= tolerance) {
      last.items.push({ kind: "text", span });
      last.fontSize = Math.max(last.fontSize, span.fontSize);
      continue;
    }
    lines.push({
      baseline: span.y,
      x: span.x,
      width: span.width,
      fontSize: span.fontSize,
      rtl: span.dir === "rtl" || isRtlText(span.text),
      items: [{ kind: "text", span }],
    });
  }

  for (const line of lines) {
    const text = line.items
      .filter((item): item is { kind: "text"; span: PdfSpan } => item.kind === "text")
      .map((item) => item.span);
    const joined = text.map((span) => span.text).join("");
    const rtlVotes = text.filter((span) => span.dir === "rtl" || isRtlText(span.text)).length;
    line.rtl = isRtlText(joined) || rtlVotes > text.length / 2;

    // Prefer geometric reading order: RTL lines read right→left on the page.
    // When pdf.js already emitted logical chunks with visual x, this restores
    // word order. Gaps use box distance so sorting direction does not matter.
    text.sort((a, b) => (line.rtl ? b.x - a.x || b.width - a.width : a.x - b.x));
    line.items = text.map((span) => ({ kind: "text" as const, span }));
    const first = text[0];
    const last = text[text.length - 1];
    if (!first || !last) continue;
    line.x = Math.min(...text.map((span) => span.x));
    const right = Math.max(...text.map((span) => span.x + span.width));
    line.width = right - line.x;
  }

  return lines;
}

function attachInlineImages(lines: Line[], images: Array<PdfImageRef & { index: number }>, pageHeight: number) {
  const remaining: Array<PdfImageRef & { index: number }> = [];

  for (const image of images) {
    const imageTop = yTopForImage(image, pageHeight);
    const imageBottom = imageTop + image.height;
    const host = lines.find((line) => {
      const top = pageHeight - line.baseline - line.fontSize * 0.85;
      const bottom = top + line.fontSize * 1.35;
      const overlap = Math.min(bottom, imageBottom) - Math.max(top, imageTop);
      return overlap > image.height * 0.35 && image.height <= line.fontSize * 2.4 && image.height < 42;
    });
    if (!host) {
      remaining.push(image);
      continue;
    }
    host.items.push({ kind: "image", imageIndex: image.index, x: image.x, width: image.width, height: image.height });
    host.items.sort((a, b) => {
      const ax = a.kind === "text" ? a.span.x : a.x;
      const bx = b.kind === "text" ? b.span.x : b.x;
      return host.rtl ? bx - ax : ax - bx;
    });
  }

  return remaining;
}

function lineRuns(line: Line): RunModel[] {
  const runs: RunModel[] = [];
  let previousSpan: PdfSpan | null = null;

  for (const item of line.items) {
    if (item.kind === "image") {
      previousSpan = null;
      runs.push({
        kind: "image",
        imageIndex: item.imageIndex,
        widthPx: pointsToPx(item.width),
        heightPx: pointsToPx(item.height),
      });
      continue;
    }

    const span = item.span;
    // Text was already repaired in spansFromTextContent — only re-sanitize.
    const text = sanitizeXmlText(span.text);
    if (!text.length) {
      previousSpan = span;
      continue;
    }
    const rtl = span.dir === "rtl" || isRtlText(text) || line.rtl;
    const fontFamily = fontForRun(span.fontFamily, text, rtl);
    const gap = previousSpan ? insertGapText(previousSpan, span) : "";
    if (gap && runs.length) {
      const last = runs[runs.length - 1];
      if (last?.kind === "text") last.text += gap;
      else
        runs.push({
          kind: "text",
          text: gap,
          fontSize: span.fontSize,
          fontFamily,
          bold: false,
          italic: false,
          color: span.color,
          rtl: line.rtl,
        });
    }

    const last = runs[runs.length - 1];
    if (last?.kind === "text" && previousSpan && sameStyle(previousSpan, span) && last.rtl === rtl) {
      last.text += text;
    } else {
      runs.push({
        kind: "text",
        text,
        fontSize: span.fontSize,
        fontFamily,
        bold: span.bold,
        italic: span.italic,
        color: span.color,
        rtl,
      });
    }
    previousSpan = span;
  }

  return runs.filter((run) => run.kind === "image" || run.text.length > 0);
}

function linesBelongTogether(current: Line, next: Line) {
  const gap = current.baseline - next.baseline;
  if (gap > current.fontSize * 1.7) return false;
  if (Math.abs(current.fontSize - next.fontSize) / Math.max(current.fontSize, next.fontSize) > 0.22) return false;
  if (current.rtl !== next.rtl) return false;
  if (Math.abs(current.x - next.x) > Math.max(22, current.fontSize * 2.4)) return false;
  return gap <= current.fontSize * 1.55;
}

function isJustified(lines: Line[], pageWidth: number, marginLeft: number, marginRight: number) {
  if (lines.length < 2) return false;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const body = lines.slice(0, -1);
  return body.every((line) => {
    const leftGap = Math.abs(line.x - marginLeft);
    const right = line.x + line.width;
    const rightGap = Math.abs(pageWidth - marginRight - right);
    return leftGap < 10 && rightGap < 14 && line.width > contentWidth * 0.86;
  });
}

export function layoutPage(
  pageWidth: number,
  pageHeight: number,
  spans: PdfSpan[],
  images: PdfImageRef[],
  options?: { forceVisual?: boolean; forceEditable?: boolean; forceHybrid?: boolean },
): PageLayout {
  const textChars = spans.reduce((sum, span) => sum + span.text.replace(/\s+/g, "").length, 0);
  const checkboxCount = spans.reduce(
    (sum, span) => sum + (span.text.match(/[☐☑☒□■]/g) ?? []).length,
    0,
  );
  const contentImages = images
    .map((image, index) => ({ ...image, index }))
    .filter((image) => image.width >= 4 && image.height >= 4 && image.width * image.height >= 24);

  const foreground = contentImages.filter((image) => !isFullPageBackground(image, pageWidth, pageHeight));
  const pageArea = Math.max(1, pageWidth * pageHeight);
  const largeVisual = contentImages.some((image) => image.width * image.height > pageArea * 0.45);
  const scanned = textChars < 8 && largeVisual;
  const useVisualFallback = Boolean(options?.forceVisual) || (scanned && !options?.forceEditable);

  if (useVisualFallback) {
    return {
      widthPt: pageWidth,
      heightPt: pageHeight,
      margin: { top: 36, right: 36, bottom: 36, left: 36 },
      blocks: [],
      useVisualFallback: true,
      includeVisualReference: false,
      hybridReason: "",
      wordCount: countWords(spans.map((span) => span.text).join(" ")),
      imageCount: 1,
      tableCount: 0,
      formTableCount: 0,
    };
  }

  const lines = groupSpansIntoLines(spans);
  const blockImages = attachInlineImages(lines, foreground, pageHeight);

  const xs = [
    ...spans.map((span) => span.x),
    ...blockImages.map((image) => image.x),
    ...lines.map((line) => line.x),
  ];
  const rights = [
    ...spans.map((span) => span.x + span.width),
    ...blockImages.map((image) => image.x + image.width),
    ...lines.map((line) => line.x + line.width),
  ];
  const tops = [
    ...spans.map((span) => yTopForSpan(span, pageHeight)),
    ...blockImages.map((image) => yTopForImage(image, pageHeight)),
  ];
  const bottoms = [
    ...spans.map((span) => yTopForSpan(span, pageHeight) + span.fontSize),
    ...blockImages.map((image) => yTopForImage(image, pageHeight) + image.height),
  ];

  const rawLeft = xs.length ? Math.min(...xs) : 72;
  const rawRight = rights.length ? pageWidth - Math.max(...rights) : 72;
  const rawTop = tops.length ? Math.min(...tops) : 72;
  const rawBottom = bottoms.length ? pageHeight - Math.max(...bottoms) : 72;
  const margin = {
    left: Math.max(18, Math.min(96, rawLeft)),
    right: Math.max(18, Math.min(96, rawRight)),
    top: Math.max(18, Math.min(96, rawTop)),
    bottom: Math.max(18, Math.min(96, rawBottom)),
  };

  type Flow =
    | { kind: "line"; yTop: number; line: Line }
    | { kind: "image"; yTop: number; image: PdfImageRef & { index: number } };

  const flow: Flow[] = [
    ...lines.map((line) => ({
      kind: "line" as const,
      yTop: pageHeight - line.baseline - line.fontSize * 0.85,
      line,
    })),
    ...blockImages.map((image) => ({
      kind: "image" as const,
      yTop: yTopForImage(image, pageHeight),
      image,
    })),
  ].sort((a, b) => a.yTop - b.yTop || (a.kind === "image" ? -1 : 1));

  const blocks: LayoutBlock[] = [];
  let previousBottom = margin.top;
  let paragraphLines: Line[] = [];
  let pendingTable: TableBlock | null = null;

  const flushTable = () => {
    if (!pendingTable) return;
    blocks.push(pendingTable);
    pendingTable = null;
  };

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const first = paragraphLines[0];
    const last = paragraphLines[paragraphLines.length - 1];
    if (!first || !last) {
      paragraphLines = [];
      return;
    }

    const alignmentGuess = lineAlignment(first, pageWidth, margin.left, margin.right);
    const justified = alignmentGuess !== "center" && isJustified(paragraphLines, pageWidth, margin.left, margin.right);
    const alignment = justified ? "both" : alignmentGuess;
    const rtl = paragraphLines.filter((line) => line.rtl).length >= paragraphLines.length / 2;
    const fontSize = median(paragraphLines.map((line) => line.fontSize)) || first.fontSize;
    const firstTop = pageHeight - first.baseline - first.fontSize * 0.85;
    const spaceBefore = Math.max(0, firstTop - previousBottom);
    const indent = Math.max(0, first.x - margin.left);
    const bodyIndent = median(paragraphLines.map((line) => Math.max(0, line.x - margin.left)));
    const firstLine = Math.max(0, indent - bodyIndent);

    const runs: RunModel[] = [];
    paragraphLines.forEach((line, index) => {
      if (index > 0) {
        const prev = runs[runs.length - 1];
        if (prev?.kind === "text") prev.text += " ";
        else runs.push({ kind: "text", text: " ", fontSize: line.fontSize, fontFamily: "Arial", bold: false, italic: false, color: "000000", rtl });
      }
      runs.push(...lineRuns(line));
    });

    // Phase 6 — skip ☐/:/punctuation-only leftovers so voids collapse.
    const plain = runsPlainText(runs);
    previousBottom = pageHeight - last.baseline + last.fontSize * 0.25;
    paragraphLines = [];
    if (isEmptyishBlockText(plain)) return;

    blocks.push({
      type: "text",
      alignment: rtl && alignment === "left" ? "right" : alignment,
      rtl,
      indentTwips: pointsToTwips(bodyIndent),
      firstLineTwips: pointsToTwips(firstLine),
      spaceBeforeTwips: compressSpaceBeforeTwips(spaceBefore),
      spaceAfterTwips: 0,
      lineTwips: Math.max(240, pointsToTwips(fontSize * 1.18)),
      runs,
    });
  };

  const appendTableRow = (
    line: Line,
    clusters: PdfSpan[][],
    yTop: number,
    options: { borders: boolean; role: "columns" | "form" },
  ) => {
    const cells: TableCellModel[] = clusters.map((cluster) => {
      const cellLine = lineFromCluster(cluster, line.baseline, line.fontSize);
      return {
        runs: lineRuns(cellLine),
        rtl: cellLine.rtl,
        alignment: (cellLine.rtl ? "right" : "left") as TextBlock["alignment"],
      };
    });
    // Phase 6 — drop colon/punctuation-only rows; keep checkbox grids even without labels.
    const rowText = cells.map((cell) => runsPlainText(cell.runs)).join("");
    if (!rowText.replace(/\s+/g, "").length || (isEmptyishBlockText(rowText) && !/[☐☑☒□■]/.test(rowText))) {
      previousBottom = yTop + line.fontSize * 1.15;
      return;
    }
    const spaceBefore = Math.max(0, yTop - previousBottom);
    if (
      pendingTable &&
      pendingTable.rows[0]?.length === cells.length &&
      pendingTable.borders === options.borders &&
      pendingTable.role === options.role
    ) {
      pendingTable.rows.push(cells);
    } else {
      flushTable();
      pendingTable = {
        type: "table",
        rows: [cells],
        spaceBeforeTwips: compressSpaceBeforeTwips(spaceBefore),
        borders: options.borders,
        role: options.role,
      };
    }
    previousBottom = yTop + line.fontSize * 1.15;
  };

  for (const item of flow) {
    if (item.kind === "image") {
      flushParagraph();
      flushTable();
      const spaceBefore = Math.max(0, item.yTop - previousBottom);
      blocks.push({
        type: "image",
        imageIndex: item.image.index,
        spaceBeforeTwips: compressSpaceBeforeTwips(spaceBefore),
        widthPx: pointsToPx(item.image.width),
        heightPx: pointsToPx(item.image.height),
      });
      previousBottom = item.yTop + item.image.height;
      continue;
    }

    const textSpans = item.line.items
      .filter((entry): entry is { kind: "text"; span: PdfSpan } => entry.kind === "text")
      .map((entry) => entry.span);

    // Phase 3: multi-checkbox option rows → bordered form table.
    const formCells = splitSpansIntoFormCells(textSpans);
    if (formCells && formCells.length >= 2) {
      flushParagraph();
      appendTableRow(item.line, formCells, item.yTop, { borders: true, role: "form" });
      continue;
    }

    // Phase 2: wide gutters → column table (bordered when a lone checkbox is present).
    const clusters = splitSpansIntoColumnClusters(textSpans);
    if (clusters.length >= 2) {
      flushParagraph();
      const hasCheckbox = textSpans.some(isCheckboxSpan);
      appendTableRow(item.line, clusters, item.yTop, {
        borders: hasCheckbox,
        role: hasCheckbox ? "form" : "columns",
      });
      continue;
    }

    flushTable();
    const last = paragraphLines[paragraphLines.length - 1];
    if (last && !linesBelongTogether(last, item.line)) flushParagraph();
    paragraphLines.push(item.line);
  }
  flushParagraph();
  flushTable();

  const wordCount = countWords(
    spans
      .map((span) => span.text)
      .join(" ")
      .replace(/\t/g, " "),
  );

  const tableBlocks = blocks.filter((block): block is TableBlock => block.type === "table");
  const tableCount = tableBlocks.length;
  const formTableCount = tableBlocks.filter((block) => block.role === "form").length;

  const hybrid = options?.forceEditable
    ? { needed: false, reason: "" }
    : options?.forceHybrid
      ? { needed: true, reason: "forced_hybrid" }
      : pageNeedsHybridVisual({
          textChars,
          pageWidth,
          pageHeight,
          images: contentImages,
          formTableCount,
          tableCount,
          checkboxCount,
        });

  return {
    widthPt: pageWidth,
    heightPt: pageHeight,
    margin,
    blocks,
    useVisualFallback: false,
    includeVisualReference: hybrid.needed,
    hybridReason: hybrid.reason,
    wordCount,
    imageCount: blockImages.length + lines.reduce((sum, line) => sum + line.items.filter((item) => item.kind === "image").length, 0),
    tableCount,
    formTableCount,
  };
}

export function previewTextFromLayouts(pages: PageLayout[]) {
  return pages
    .map((page, pageIndex) => {
      if (page.useVisualFallback) return `[Page ${pageIndex + 1} visual copy]`;
      const body = page.blocks
        .map((block) => {
          if (block.type === "image") return `[image ${block.imageIndex + 1}]`;
          if (block.type === "table") {
            return block.rows
              .map((row) =>
                row
                  .map((cell) => cell.runs.map((run) => (run.kind === "text" ? run.text : `[image ${run.imageIndex + 1}]`)).join(""))
                  .join(" | "),
              )
              .join("\n");
          }
          return block.runs.map((run) => (run.kind === "text" ? run.text : `[image ${run.imageIndex + 1}]`)).join("");
        })
        .join("\n");
      if (page.includeVisualReference) {
        return `${body}\n[Page ${pageIndex + 1} visual reference${page.hybridReason ? `: ${page.hybridReason}` : ""}]`;
      }
      return body;
    })
    .join("\n\n")
    .trim();
}
