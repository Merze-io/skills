#!/usr/bin/env node
/**
 * Ensure dist/ has no unintended "github" substrings (case-insensitive).
 *
 * Policy (documented in site/DESIGN.md):
 * - Scrub Pagefind UI translator credit URLs first.
 * - Allowlist ONLY the literal term "github-copilot".
 * - Fail closed: every other hit in any dist file (text, indexes, wasm,
 *   images including PNG zTXt/iTXt, fonts) fails the build — including skill
 *   content under dist/skill/ raw trees.
 * - Any file starting with gzip magic `1f 8b` is gunzipped before scanning.
 * - Unreadable files fail the build (no warn-and-skip).
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
  return text.replace(/github-copilot/gi, "");
}

function containsGithub(text) {
  return /github/i.test(stripAllowedMentions(text));
}

function isGzip(buf) {
  return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

/** Decode PNG tEXt / zTXt / iTXt chunk payloads for text scanning. */
function pngTextPayloads(buf) {
  if (buf.length < 8) return [];
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buf.subarray(0, 8).equals(sig)) return [];

  const out = [];
  let offset = 8;
  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) break;
    const data = buf.subarray(dataStart, dataEnd);

    try {
      if (type === "tEXt") {
        out.push(data.toString("latin1"));
      } else if (type === "zTXt") {
        const nul = data.indexOf(0);
        if (nul >= 0 && nul + 2 <= data.length) {
          // compression method byte at nul+1; zlib payload follows
          const inflated = zlib.inflateSync(data.subarray(nul + 2));
          out.push(
            data.subarray(0, nul).toString("latin1") +
              "\0" +
              inflated.toString("utf8"),
          );
        }
      } else if (type === "iTXt") {
        // keyword\0 compressionFlag compressionMethod language\0 translated\0 text
        let i = 0;
        const nextCString = () => {
          const start = i;
          const z = data.indexOf(0, start);
          if (z < 0) return null;
          const s = data.subarray(start, z);
          i = z + 1;
          return s;
        };
        const keyword = nextCString();
        if (!keyword || i + 2 > data.length) {
          // fall through
        } else {
          const compressionFlag = data[i];
          i += 2; // flag + method
          const language = nextCString();
          const translated = nextCString();
          if (language && translated && i <= data.length) {
            const textBytes = data.subarray(i);
            const text =
              compressionFlag === 1
                ? zlib.inflateSync(textBytes).toString("utf8")
                : textBytes.toString("utf8");
            out.push(
              keyword.toString("utf8") +
                "\0" +
                language.toString("utf8") +
                "\0" +
                translated.toString("utf8") +
                "\0" +
                text,
            );
          }
        }
      }
    } catch {
      // Malformed chunk — still scan raw chunk bytes below via latin1 on whole file.
    }

    offset = dataEnd + 4; // skip CRC
    if (type === "IEND") break;
  }
  return out;
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

  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch (err) {
    offenders.push(`${rel} (unreadable: ${err.message})`);
    continue;
  }

  // Gunzip any gzip container (Pagefind .pf_*, wasm.*.pagefind, etc.)
  let scanBuf = buf;
  let gunzipped = false;
  if (isGzip(buf)) {
    try {
      scanBuf = zlib.gunzipSync(buf);
      gunzipped = true;
    } catch (err) {
      offenders.push(`${rel} (gzip unreadable: ${err.message})`);
      continue;
    }
  }

  const label = gunzipped ? `${rel} (gunzipped)` : rel;

  // PNG compressed/international text chunks
  if (/\.png$/i.test(file)) {
    for (const payload of pngTextPayloads(buf)) {
      if (containsGithub(payload)) {
        offenders.push(`${rel} (png text chunk)`);
        break;
      }
    }
  }

  const text = scanBuf.toString(
    scanBuf.includes(0) ||
      !/^[\x09\x0a\x0d\x20-\x7e]*$/.test(scanBuf.toString("latin1"))
      ? "latin1"
      : "utf8",
  );
  if (containsGithub(text)) {
    offenders.push(label);
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
