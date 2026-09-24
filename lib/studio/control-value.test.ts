import { describe, expect, it } from "vitest";
import {
  clampStudioNumber,
  formatStudioControlValue,
  parsePanInput,
  parseStudioNumber,
} from "@/lib/studio/control-value";

describe("studio control values", () => {
  it("parses and clamps plain numbers", () => {
    expect(parseStudioNumber("1,5")).toBe(1.5);
    expect(parseStudioNumber("")).toBeNull();
    expect(parseStudioNumber("nope")).toBeNull();
    expect(clampStudioNumber(12, -6, 6)).toBe(6);
    expect(clampStudioNumber(Number.NaN, -6, 6)).toBe(-6);
  });

  it("parses pan as center, LR labels, unit, or percent", () => {
    expect(parsePanInput("C")).toBe(0);
    expect(parsePanInput("L50")).toBe(-0.5);
    expect(parsePanInput("r25")).toBe(0.25);
    expect(parsePanInput("-0.5")).toBe(-0.5);
    expect(parsePanInput("80")).toBe(0.8);
    expect(parsePanInput("")).toBeNull();
  });

  it("formats fixed digits without trailing junk", () => {
    expect(formatStudioControlValue(0.1, 1)).toBe("0.1");
    expect(formatStudioControlValue(1.234, 2)).toBe("1.23");
    expect(formatStudioControlValue(3.2, 0)).toBe("3");
  });
});
