#!/usr/bin/env node
/**
 * Copy allowlisted skill files into dist/files/<slug>/ for same-origin download.
 * Policy: site/src/lib/skill-sources.mjs (shared with MER-1098).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  listPublishableSkillDirs,
  listSafeSkillFiles,
} from "../src/lib/skill-sources.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(siteRoot, "..");
const distFiles = path.join(siteRoot, "dist", "files");

fs.rmSync(distFiles, { recursive: true, force: true });
fs.mkdirSync(distFiles, { recursive: true });

const slugs = listPublishableSkillDirs(repoRoot);
let fileCount = 0;

for (const slug of slugs) {
  const skillDir = path.join(repoRoot, slug);
  const files = listSafeSkillFiles(skillDir);
  const destRoot = path.join(distFiles, slug);
  for (const file of files) {
    const dest = path.join(destRoot, file.relativePath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file.absolutePath, dest);
    fileCount += 1;
  }
  console.log(`copied files/${slug}/ (${files.length} file(s))`);
}

console.log(
  `Copied ${fileCount} file(s) across ${slugs.length} skill folder(s) into dist/files/`,
);
