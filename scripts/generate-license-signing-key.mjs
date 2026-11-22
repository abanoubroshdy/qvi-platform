#!/usr/bin/env node
import { generateKeyPairSync } from "node:crypto";
import { writeFileSync } from "node:fs";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

writeFileSync("license-signing-private.pem", privateKey, { mode: 0o600 });
writeFileSync("license-signing-public.pem", publicKey, { mode: 0o644 });

console.log("Wrote license-signing-private.pem and license-signing-public.pem");
console.log("");
console.log("Vercel / server env:");
console.log("  LICENSE_SIGNING_PRIVATE_KEY = paste private PEM (use \\n for newlines in one line)");
console.log("  SUPABASE_SECRET_KEY = service role key (required for license API)");
console.log("  LICENSE_ADMIN_EMAILS = comma-separated admin emails");
console.log("  R2_* = required for protected artifact presigns");
console.log("");
console.log("Desktop app (LicenseOptions.LicensePublicKeyPem):");
console.log(publicKey);