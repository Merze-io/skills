/**
 * Shared rules for which skill-folder files may be published under /files/
 * and /skill/ (MER-1098). Allowlist / symlink / path policy stays one source.
 * MER-1103 content-collection filters reuse the same helpers.
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
 * Strict skill-relative file-name rule (single source of truth for MER-1098 /
 * MER-1103). Every path segment must be `[A-Za-z0-9._-]+` with no leading dot;
 * rejects `..`, empty segments, backslashes, control characters, and absolute
 * paths. Callers (listSafeSkillFiles, verify-dist, #4 content filters) IMPORT
 * this — do not copy.
 *
 * Canonical owner: skills#3 @ dd61487. Keep this function identical across PRs.
 */
export const SKILL_PATH_SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

export function assertSafeSkillRelativePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    throw new Error("[skill-sources] empty relative path");
  }
  if (/[\\\x00-\x1f\x7f]/.test(relativePath)) {
    throw new Error(
      `[skill-sources] unsafe path (backslash or control char): ${JSON.stringify(relativePath)}`,
    );
  }
  if (path.posix.isAbsolute(relativePath)) {
    throw new Error(
      `[skill-sources] absolute path rejected: ${JSON.stringify(relativePath)}`,
    );
  }
  const segments = relativePath.split("/");
  for (const seg of segments) {
    if (seg === "" || seg === ".." || seg.startsWith(".")) {
      throw new Error(
        `[skill-sources] unsafe path segment (${JSON.stringify(seg)}): ${JSON.stringify(relativePath)}`,
      );
    }
    if (!SKILL_PATH_SEGMENT_RE.test(seg)) {
      throw new Error(
        `[skill-sources] path segment must match [A-Za-z0-9._-] (no leading dot): ${JSON.stringify(relativePath)}`,
      );
    }
  }
}

function isInsideDir(childReal, rootReal) {
  return (
    childReal === rootReal || childReal.startsWith(rootReal + path.sep)
  );
}

/**
 * True when `candidatePath` is a regular, allowlisted file confined to
 * `skillDir` with a safe relative path. Symbolic links return false
 * (collection filter); `listSafeSkillFiles` fails the build on symlinks.
 */
export function isSafeSkillSourceFile(candidatePath, skillDir) {
  const root = path.resolve(skillDir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return false;

  const rootReal = fs.realpathSync(root);
  const candidate = path.resolve(candidatePath);

  let st;
  try {
    st = fs.lstatSync(candidate);
  } catch {
    return false;
  }

  if (st.isSymbolicLink()) return false;
  if (!st.isFile()) return false;
  if (!isAllowedSkillFileName(path.basename(candidate))) return false;

  let relativePath;
  try {
    relativePath = path.relative(root, candidate).split(path.sep).join("/");
    assertSafeSkillRelativePath(relativePath);
  } catch {
    return false;
  }

  let fileReal;
  try {
    fileReal = fs.realpathSync(candidate);
  } catch {
    return false;
  }

  return isInsideDir(fileReal, rootReal);
}

/**
 * Walk a skill folder and return only safe, allowlisted regular files.
 * - Fails the build on symbolic links (plan §2.1).
 * - Rejects any path whose realpath escapes the skill root.
 * - Rejects relative paths with `\`, controls, `..`, or absolute form.
 * - Throws if a file has a disallowed extension (fail loudly).
 * - Lists SKILL.md first, then locale-sorted paths.
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
        throw new Error(
          `[skill-sources] symlink not allowed in skill folder: ${path.relative(root, from)}`,
        );
      }

      if (entry.isDirectory()) {
        const dirReal = fs.realpathSync(from);
        if (!isInsideDir(dirReal, rootReal)) {
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
      if (!isInsideDir(fileReal, rootReal)) {
        throw new Error(
          `Skill file resolves outside skill folder: ${from} -> ${fileReal}`,
        );
      }

      const relativePath = path.relative(root, from).split(path.sep).join("/");
      assertSafeSkillRelativePath(relativePath);
      out.push({ relativePath, absolutePath: from });
    }
  }

  walk(root);
  return out.sort((a, b) => {
    if (a.relativePath === "SKILL.md") return -1;
    if (b.relativePath === "SKILL.md") return 1;
    return a.relativePath.localeCompare(b.relativePath, "en");
  });
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
