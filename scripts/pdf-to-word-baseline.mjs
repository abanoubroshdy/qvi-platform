#!/usr/bin/env node
/**
 * Phase 0 baseline: measure fixtures with the diagnostics classifier and write
 * fixtures/pdf-to-word/BASELINE.md
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: join(root, "vitest.config.ts"),
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const mod = await server.ssrLoadModule("/lib/pdf-to-word-diagnostics.ts");
    const {
      extractRawPagesFromPdf,
      diagnoseFromRawPages,
      formatDiagnosticsReport,
    } = mod;

    const fixtureDir = join(root, "fixtures", "pdf-to-word");
    const sections = [];

    const vocalPath = join(fixtureDir, "vocal_assessment_form.pdf");
    const vocalData = new Uint8Array(readFileSync(vocalPath));
    const vocalPages = await extractRawPagesFromPdf(vocalData);
    const vocalDiag = diagnoseFromRawPages(vocalPages);
    sections.push(formatDiagnosticsReport(vocalDiag, "vocal_assessment_form.pdf"));

    const samplesDir = join(fixtureDir, "samples");
    for (const file of readdirSync(samplesDir).filter((name) => name.endsWith(".json")).sort()) {
      const sample = JSON.parse(readFileSync(join(samplesDir, file), "utf8"));
      const diag = diagnoseFromRawPages(sample.pages);
      sections.push(formatDiagnosticsReport(diag, `${sample.id} (${file})`));
      sections.push(`_${sample.description}_\n`);
    }

    const englishPath = join(fixtureDir, "simple-english-form.pdf");
    const englishDiag = diagnoseFromRawPages(await extractRawPagesFromPdf(new Uint8Array(readFileSync(englishPath))));
    sections.push(formatDiagnosticsReport(englishDiag, "simple-english-form.pdf"));

    const header = [
      "# PDF→Word Phase 0–6 — Diagnostics baseline (post layout density)",
      "",
      "Layout stack complete; Phase 6 densifies editable Word output (compressed gaps, drop emptyish blocks, no blank table spacers).",
      "",
      "## Goals of this baseline",
      "",
      "1. Confirm broken-font Arabic recovery ratio on the real vocal form.",
      "2. Confirm Word XML stays free of illegal controls after normalize.",
      "3. Confirm Phases 1–4: latin cleanup, columns, form tables, hybrid visual reference.",
      "4. Phase 5 ships UX polish; Phase 6 densifies layout so pages are not mostly blank.",
      "5. Metrics below stay the conversion quality baseline (density is spacing, not recovery counts).",
      "",
      "---",
      "",
    ].join("\n");

    const footer = [
      "---",
      "",
      "## Phase status",
      "",
      "| Signal | Phase | Status |",
      "| --- | --- | --- |",
      "| `latin_corruption` | Phase 1 — text cleanup | **done** |",
      "| `tab_heavy_layout` | Phase 2 — columns | **done** |",
      "| checkbox / option grids | Phase 3 — form tables | **done** |",
      "| `hybrid_visual_reference` | Phase 4 — hybrid visual | **done** |",
      "| progress / summary / copy | Phase 5 — polish | **done** |",
      "| empty-looking Word / huge gaps | Phase 6 — layout density | **done** |",
      "",
      `Regenerate: \`node scripts/pdf-to-word-baseline.mjs\``,
      "",
    ].join("\n");

    const out = join(fixtureDir, "BASELINE.md");
    writeFileSync(out, `${header}${sections.join("\n---\n\n")}\n${footer}`);
    console.log(`Wrote ${out}`);
    console.log(
      `vocal overall=${vocalDiag.summary.overallClass} recovery=${vocalDiag.summary.meanRecoveryRatio.toFixed(3)} tables=${vocalDiag.summary.totalTables}`,
    );
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
