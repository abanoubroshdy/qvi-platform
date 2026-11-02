import { readFileSync } from "node:fs";

const FREE_GZIP_KIB = 3 * 1024;

function stripJsonc(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function fail(message) {
  console.error(`free-tier check: ${message}`);
  process.exit(1);
}

const config = JSON.parse(stripJsonc(readFileSync("wrangler.jsonc", "utf8")));

if (config.name !== "qvi-platform") {
  fail(`worker name must stay qvi-platform (found ${config.name})`);
}

const forbidden = [
  "routes",
  "route",
  "r2_buckets",
  "d1_databases",
  "kv_namespaces",
  "durable_objects",
  "services",
  "queues",
];
for (const key of forbidden) {
  const value = config[key];
  if (value == null) continue;
  if (Array.isArray(value) && value.length === 0) continue;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue;
  fail(`${key} is set. Phase 1 Free beta must not bind routes, R2, D1, KV, queues, or Durable Objects.`);
}

if (config.limits?.cpu_ms != null && Number(config.limits.cpu_ms) > 10) {
  fail(`limits.cpu_ms is ${config.limits.cpu_ms}. Free Workers cap CPU at 10 ms. Do not raise it.`);
}

const logArg = process.argv.indexOf("--dry-log");
if (logArg !== -1) {
  const logPath = process.argv[logArg + 1];
  if (!logPath) fail("--dry-log needs a file path");
  const log = readFileSync(logPath, "utf8");
  const match = log.match(/gzip:\s*([0-9]+(?:\.[0-9]+)?)\s*KiB/i);
  if (!match) fail(`could not find gzip size in ${logPath}`);
  const gzipKib = Number(match[1]);
  console.log(`free-tier check: worker gzip ${gzipKib} KiB (Free limit ${FREE_GZIP_KIB} KiB)`);
  if (gzipKib > FREE_GZIP_KIB) {
    fail(`gzip ${gzipKib} KiB exceeds the Free plan script limit of ${FREE_GZIP_KIB} KiB`);
  }
}

console.log("free-tier check: wrangler.jsonc has no production routes or paid bindings");
