#!/usr/bin/env node
/**
 * Fail (or scrub known third-party credit URLs) so dist/ never contains
 * the substring "github" (case-insensitive). Pagefind UI embeds translator
 * profile links; we neutralize those strings after indexing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "..", "dist");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// Scrub known Pagefind translator credit URL patterns first.
const PAGEFIND_SCRUBS = [
  /https?:\/\/github\.com\/[A-Za-z0-9_.-]+/gi,
  /https?:\/\/[A-Za-z0-9_.-]+\.github\.io/gi,
];

let scrubbed = 0;
for (const file of walk(path.join(dist, "pagefind"))) {
  if (!/\.(js|mjs|cjs|css|json|html|txt|md)$/i.test(file)) continue;
  let text = fs.readFileSync(file, "utf8");
  let next = text;
  for (const re of PAGEFIND_SCRUBS) next = next.replace(re, "");
  if (next !== text) {
    fs.writeFileSync(file, next);
    scrubbed += 1;
  }
}

const offenders = [];
for (const file of walk(dist)) {
  // Skip binary-ish assets; still scan text/web formats thoroughly.
  if (!/\.(html|js|mjs|cjs|css|json|txt|xml|md|svg|map|csv)$/i.test(file)) {
    // Also scan extensionless and wasm/index fragments that might be text
    const base = path.basename(file);
    if (base.includes(".")) continue;
  }
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch {
    continue;
  }
  // Skip obvious binaries
  if (buf.includes(0)) continue;
  const text = buf.toString("utf8");
  if (/github/i.test(text)) offenders.push(path.relative(dist, file));
}

if (scrubbed) {
  console.log(`Scrubbed github URLs from ${scrubbed} pagefind file(s)`);
}

if (offenders.length) {
  console.error("dist/ still contains 'github':");
  for (const o of offenders) console.error(" ", o);
  process.exit(1);
}

console.log("dist/ is free of 'github' substrings");
