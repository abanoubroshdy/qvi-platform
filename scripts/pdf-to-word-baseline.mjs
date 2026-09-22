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
      "# PDF→Word Phase 0/1 — Diagnostics baseline (post Phase 1 cleanup)",
      "",
      "Phase 0 measures pages; Phase 1 repairs Latin first-letter corruption (`%asic`→Basic, `7echnical`→Technical, …).",
      "Layout debt (tabs / checkboxes / 0 tables) remains for Phases 2–3.",
      "",
      "## Goals of this baseline",
      "",
      "1. Confirm broken-font Arabic recovery ratio on the real vocal form.",
      "2. Confirm Word XML stays free of illegal controls after normalize.",
      "3. Confirm Phase 1 cleared `latin_corruption` on the vocal form.",
      "4. Record layout debt: **0 tables**, tab/checkbox-heavy pages → `partial_broken`.",
      "5. Freeze page classes: `clean` | `partial_broken` | `needs_visual` for later phases.",
      "",
      "---",
      "",
    ].join("\n");

    const footer = [
      "---",
      "",
      "## Implications for later phases",
      "",
      "| Signal | Phase | Status |",
      "| --- | --- | --- |",
      "| `latin_corruption`, leftover `%asic` / `7echnical` | Phase 1 — text cleanup | **done** (cleared on vocal form) |",
      "| `tab_heavy_layout` | Phase 2 — columns | pending |",
      "| `form_controls_without_tables` / `likely_lost_table_structure` | Phase 3 — tables | pending |",
      "| `needs_visual` pages | Phase 4 — hybrid visual | pending |",
      "| polish / UX | Phase 5 | pending |",
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
