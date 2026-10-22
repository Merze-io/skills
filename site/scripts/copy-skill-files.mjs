#!/usr/bin/env node
/**
 * Copy each publishable skill folder into dist/files/<slug>/ so the catalog
 * can offer same-origin downloads (SKILL.md and supporting files).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(siteRoot, "..");
const distFiles = path.join(siteRoot, "dist", "files");

const SKIP = new Set(["site", "node_modules", ".git", ".agents", "dist"]);

function isPublishable(name) {
  return (
    Boolean(name) &&
    !name.startsWith("_") &&
    !name.startsWith(".") &&
    !SKIP.has(name)
  );
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

fs.rmSync(distFiles, { recursive: true, force: true });
fs.mkdirSync(distFiles, { recursive: true });

let count = 0;
for (const entry of fs.readdirSync(repoRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || !isPublishable(entry.name)) continue;
  const skillDir = path.join(repoRoot, entry.name);
  if (!fs.existsSync(path.join(skillDir, "SKILL.md"))) continue;
  copyDir(skillDir, path.join(distFiles, entry.name));
  count += 1;
  console.log(`copied files/${entry.name}/`);
}

console.log(`Copied ${count} skill folder(s) into dist/files/`);
