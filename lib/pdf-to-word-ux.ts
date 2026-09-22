export type PdfToWordProgressStage = "loading" | "pages" | "packaging" | "done";

/** Map converter progress ratio to a user-facing stage (Phase 5 polish). */
export function progressStageFromRatio(ratio: number, isWorking: boolean): PdfToWordProgressStage {
  if (!isWorking && ratio >= 1) return "done";
  if (ratio < 0.08) return "loading";
  if (ratio < 0.93) return "pages";
  return "packaging";
}

export type PdfToWordResultSummaryInput = {
  pages: number;
  visualPages: number;
  hybridPages: number;
};

/**
 * Break down page handling for the result strip.
 * Editable-only = pages that were neither full-visual nor hybrid.
 */
export function summarizeConversionPages(input: PdfToWordResultSummaryInput) {
  const hybridPages = Math.max(0, input.hybridPages);
  const visualOnlyPages = Math.max(0, input.visualPages - hybridPages);
  const editablePages = Math.max(0, input.pages - visualOnlyPages - hybridPages);
  return { editablePages, hybridPages, visualOnlyPages };
}

export function formatResultSummary(
  template: string,
  summary: ReturnType<typeof summarizeConversionPages>,
) {
  return template
    .replace("{editable}", String(summary.editablePages))
    .replace("{hybrid}", String(summary.hybridPages))
    .replace("{visual}", String(summary.visualOnlyPages));
}
