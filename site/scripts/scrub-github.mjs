#!/usr/bin/env node
/**
 * Ensure dist/ has no unintended "github" substrings (case-insensitive).
 *
 * Policy (documented in site/DESIGN.md):
 * - Scrub Pagefind UI translator credit URLs first.
 * - Allowlist ONLY:
 *   1) Pagefind's own runtime under dist/pagefind/*.{js,wasm} if they still
 *      contain "github" after scrub (third-party credits we cannot remove),
 *   2) the literal term "github-copilot".
 * - Any other hit — including skill content under dist/files/ — fails the build.
 * - Scans text files and decompressed Pagefind gzip indexes (.pf_*).
 *
 * This is the single scanner; CI re-runs the same script rather than a second
 * divergent grep.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
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

function isPagefindRuntime(rel) {
  return (
    /^pagefind\/.+\.(js|mjs|cjs|wasm)$/i.test(rel) ||
    /^pagefind\/.+\.wasm$/i.test(rel)
  );
}

function stripAllowedMentions(text) {
  // Literal product term allowed in skill / site copy.
  return text.replace(/github-copilot/gi, "");
}

function containsGithub(text) {
  return /github/i.test(stripAllowedMentions(text));
}

const PAGEFIND_SCRUBS = [
  /https?:\/\/github\.com\/[A-Za-z0-9_.-]+/gi,
  /https?:\/\/[A-Za-z0-9_.-]+\.github\.io/gi,
];

let scrubbed = 0;
for (const file of walk(path.join(dist, "pagefind"))) {
  if (!/\.(js|mjs|cjs)$/i.test(file)) continue;
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
  const rel = path.relative(dist, file).split(path.sep).join("/");
  const base = path.basename(file);

  // Decompress Pagefind gzip indexes and scan
  if (/\.pf_(fragment|index|meta)$/i.test(base) || /\.pf_/i.test(base)) {
    try {
      const raw = fs.readFileSync(file);
      let text;
      try {
        text = zlib.gunzipSync(raw).toString("utf8");
      } catch {
        text = raw.toString("utf8");
      }
      if (containsGithub(text)) {
        if (isPagefindRuntime(rel)) continue;
        offenders.push(`${rel} (pagefind index)`);
      }
    } catch (err) {
      console.warn(`Could not scan ${rel}:`, err.message);
    }
    continue;
  }

  if (!/\.(html|js|mjs|cjs|css|json|txt|xml|md|svg|map|csv|wasm)$/i.test(file)) {
    // Extensionless text-ish
    if (base.includes(".")) continue;
  }

  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch {
    continue;
  }

  // wasm / binary: search as latin1 byte string
  if (buf.includes(0) || /\.wasm$/i.test(file)) {
    const text = buf.toString("latin1");
    if (containsGithub(text)) {
      if (isPagefindRuntime(rel)) continue;
      offenders.push(rel);
    }
    continue;
  }

  const text = buf.toString("utf8");
  if (containsGithub(text)) {
    if (isPagefindRuntime(rel)) continue;
    offenders.push(rel);
  }
}

if (scrubbed) {
  console.log(`Scrubbed github URLs from ${scrubbed} pagefind file(s)`);
}

if (offenders.length) {
  console.error("dist/ still contains disallowed 'github' mentions:");
  for (const o of offenders) console.error(" ", o);
  console.error(
    "Allowed: pagefind/*.{js,wasm} runtime leftovers after scrub; literal 'github-copilot'.",
  );
  process.exit(1);
}

console.log("dist/ github gate passed");
