/**
 * Shared rules for which skill-folder files may be published under /files/.
 * MER-1098 (distribution) should reuse this module (or the .ts re-export) so
 * allowlist / symlink policy stays one source of truth.
 */
import fs from "node:fs";
import path from "node:path";

/** Extensions allowed for same-origin skill downloads. No svg/html/env. */
export const ALLOWED_SKILL_FILE_EXT = /\.(md|txt|json|ya?ml|csv)$/i;

const SKIP_TOP_LEVEL = new Set([
  "site",
  "node_modules",
  ".git",
  ".agents",
  "dist",
]);

export function isPublishableSkillFolder(name) {
  return (
    Boolean(name) &&
    !name.startsWith("_") &&
    !name.startsWith(".") &&
    !SKIP_TOP_LEVEL.has(name)
  );
}

export function isAllowedSkillFileName(name) {
  return ALLOWED_SKILL_FILE_EXT.test(name);
}

/**
 * Walk a skill folder and return only safe, allowlisted regular files.
 * - Skips symbolic links (never follows them).
 * - Rejects any path whose realpath escapes the skill root.
 * - Throws if a non-symlink file has a disallowed extension (fail loudly).
 */
export function listSafeSkillFiles(skillDir) {
  const root = path.resolve(skillDir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Skill folder missing or not a directory: ${skillDir}`);
  }

  const rootReal = fs.realpathSync(root);
  const out = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const from = path.join(dir, entry.name);

      if (entry.isSymbolicLink()) {
        console.warn(
          `[skill-sources] skipping symlink: ${path.relative(root, from)}`,
        );
        continue;
      }

      if (entry.isDirectory()) {
        const dirReal = fs.realpathSync(from);
        if (dirReal !== rootReal && !dirReal.startsWith(rootReal + path.sep)) {
          throw new Error(
            `Skill path resolves outside skill folder: ${from} -> ${dirReal}`,
          );
        }
        walk(from);
        continue;
      }

      if (!entry.isFile()) continue;

      if (!isAllowedSkillFileName(entry.name)) {
        throw new Error(
          `Disallowed file in skill folder (not in allowlist ${ALLOWED_SKILL_FILE_EXT}): ${path.relative(root, from)}`,
        );
      }

      const fileReal = fs.realpathSync(from);
      if (fileReal !== rootReal && !fileReal.startsWith(rootReal + path.sep)) {
        throw new Error(
          `Skill file resolves outside skill folder: ${from} -> ${fileReal}`,
        );
      }

      const relativePath = path.relative(root, from).split(path.sep).join("/");
      out.push({ relativePath, absolutePath: from });
    }
  }

  walk(root);
  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
}

export function listPublishableSkillDirs(repoRoot) {
  const root = path.resolve(repoRoot);
  const names = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !isPublishableSkillFolder(entry.name)) continue;
    const skillDir = path.join(root, entry.name);
    if (!fs.existsSync(path.join(skillDir, "SKILL.md"))) continue;
    names.push(entry.name);
  }
  return names.sort((a, b) => a.localeCompare(b, "en"));
}
