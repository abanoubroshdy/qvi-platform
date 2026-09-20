import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "pdfjs-dist");
const target = join(root, "public", "pdfjs");

if (!existsSync(join(source, "cmaps"))) {
  console.warn("pdfjs-dist is not installed; skipped cmap copy.");
  process.exit(0);
}

mkdirSync(target, { recursive: true });
cpSync(join(source, "cmaps"), join(target, "cmaps"), { recursive: true });
cpSync(join(source, "standard_fonts"), join(target, "standard_fonts"), { recursive: true });
