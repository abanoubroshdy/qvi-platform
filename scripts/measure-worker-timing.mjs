import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = (process.argv[2] || "").replace(/\/$/, "");
if (!base || !/^https?:\/\//.test(base)) {
  console.error("Usage: node scripts/measure-worker-timing.mjs <base-url>");
  console.error("Example: node scripts/measure-worker-timing.mjs https://beta.getqvi.com");
  process.exit(1);
}

// Wall-clock timings from this machine. Cloudflare CPU milliseconds and error
// 1102 show up in `wrangler tail` / the Workers dashboard, not in these numbers.
const requests = [
  { name: "GET /", args: ["-sS", "-D", "-", `${base}/`] },
  { name: "GET /ar", args: ["-sS", "-D", "-", `${base}/ar`] },
  { name: "GET /api/geo", args: ["-sS", "-D", "-", `${base}/api/geo`] },
  { name: "GET /login", args: ["-sS", "-D", "-", `${base}/login`] },
  {
    name: "POST /api/contact (invalid body, no email)",
    args: [
      "-sS",
      "-D",
      "-",
      "-X",
      "POST",
      "-H",
      "content-type: application/json",
      "--data",
      "not-json",
      `${base}/api/contact`,
    ],
  },
  { name: "GET /tools/audio-cutter", args: ["-sS", "-D", "-", `${base}/tools/audio-cutter`] },
  { name: "GET /qv1/download", args: ["-sS", "-D", "-", `${base}/qv1/download`] },
];

function headerValue(raw, name) {
  const line = raw
    .split(/\r?\n/)
    .find((entry) => entry.toLowerCase().startsWith(`${name.toLowerCase()}:`));
  return line ? line.slice(name.length + 1).trim() : "";
}

const bodyDir = mkdtempSync(join(tmpdir(), "qvi-timing-"));

console.log(`timing ${base}`);
console.log("name\tstatus\tstarttransfer_s\ttotal_s\tnote");

let failed = false;
for (const [index, request] of requests.entries()) {
  const bodyPath = join(bodyDir, `${index}.body`);
  const result = spawnSync(
    "curl",
    [
      ...request.args,
      "-o",
      bodyPath,
      "-w",
      "\n__TIMING__ %{http_code} %{time_starttransfer} %{time_total}\n",
      "--max-time",
      "30",
    ],
    { encoding: "utf8" },
  );
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const timing = output.split("\n").find((line) => line.startsWith("__TIMING__ "));
  if (result.status !== 0 || !timing) {
    failed = true;
    console.log(`${request.name}\tERROR\t\t\tcurl exit ${result.status}`);
    continue;
  }
  const [, status, start, total] = timing.split(/\s+/);
  const headers = output.slice(0, output.indexOf("__TIMING__"));
  const location = headerValue(headers, "location");
  const cfRay = headerValue(headers, "cf-ray");
  let cpuNote = "";
  try {
    const body = readFileSync(bodyPath, "utf8");
    if (body.includes("Error 1102")) {
      cpuNote = "body mentions CPU limit/1102";
      failed = true;
    }
  } catch {
    cpuNote = "body unreadable";
  }
  const note = [location ? `location=${location}` : "", cfRay ? `cf-ray=${cfRay}` : "", cpuNote]
    .filter(Boolean)
    .join(" ");
  if (status.startsWith("5")) failed = true;
  console.log(`${request.name}\t${status}\t${start}\t${total}\t${note}`);
}

if (failed) process.exit(1);
