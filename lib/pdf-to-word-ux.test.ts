import { describe, expect, it } from "vitest";
import {
  formatResultSummary,
  progressStageFromRatio,
  summarizeConversionPages,
} from "@/lib/pdf-to-word-ux";

describe("pdf-to-word UX helpers", () => {
  it("maps progress ratios to conversion stages", () => {
    expect(progressStageFromRatio(0.02, true)).toBe("loading");
    expect(progressStageFromRatio(0.4, true)).toBe("pages");
    expect(progressStageFromRatio(0.95, true)).toBe("packaging");
    expect(progressStageFromRatio(1, false)).toBe("done");
  });

  it("summarizes editable, hybrid, and visual-only pages", () => {
    expect(summarizeConversionPages({ pages: 4, visualPages: 3, hybridPages: 2 })).toEqual({
      editablePages: 1,
      hybridPages: 2,
      visualOnlyPages: 1,
    });
    expect(summarizeConversionPages({ pages: 2, visualPages: 0, hybridPages: 0 })).toEqual({
      editablePages: 2,
      hybridPages: 0,
      visualOnlyPages: 0,
    });
  });

  it("fills the result summary template", () => {
    expect(
      formatResultSummary("{editable} editable · {hybrid} hybrid · {visual} visual", {
        editablePages: 1,
        hybridPages: 2,
        visualOnlyPages: 1,
      }),
    ).toBe("1 editable · 2 hybrid · 1 visual");
  });
});
