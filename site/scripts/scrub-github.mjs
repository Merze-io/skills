#!/usr/bin/env node
/**
 * Ensure dist/ has no unintended "github" substrings (case-insensitive).
 *
 * Policy (documented in site/DESIGN.md):
 * - Scrub Pagefind UI translator credit URLs first.
 * - Allowlist ONLY the literal term "github-copilot".
 * - Fail closed: every other hit in any dist file (text, indexes, wasm,
 *   images, fonts) fails the build — including skill content under dist/files/.
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
        offenders.push(`${rel} (pagefind index)`);
      }
    } catch (err) {
      console.warn(`Could not scan ${rel}:`, err.message);
    }
    continue;
  }

  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch {
    continue;
  }

  // Binary / wasm / images / fonts: search as latin1 byte string (fail closed)
  if (buf.includes(0) || !/^[\x09\x0a\x0d\x20-\x7e]*$/.test(buf.toString("latin1"))) {
    const text = buf.toString("latin1");
    if (containsGithub(text)) {
      offenders.push(rel);
    }
    continue;
  }

  const text = buf.toString("utf8");
  if (containsGithub(text)) {
    offenders.push(rel);
  }
}

if (scrubbed) {
  console.log(`Scrubbed github URLs from ${scrubbed} pagefind file(s)`);
}

if (offenders.length) {
  console.error("dist/ still contains disallowed 'github' mentions:");
  for (const o of offenders) console.error(" ", o);
  console.error("Allowed: literal 'github-copilot' only.");
  process.exit(1);
}

console.log("dist/ github gate passed");
