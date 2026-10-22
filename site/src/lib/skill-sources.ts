/**
 * Typed re-export of the shared skill publishing rules.
 * Implementation lives in `./skill-sources.mjs` so Node build scripts and
 * Astro/TS share one allowlist + symlink policy (also for MER-1098).
 */
export {
  ALLOWED_SKILL_FILE_EXT,
  SKILL_PATH_SEGMENT_RE,
  assertSafeSkillRelativePath,
  isAllowedSkillFileName,
  isPublishableSkillFolder,
  isSafeSkillSourceFile,
  listPublishableSkillDirs,
  listSafeSkillFiles,
} from "./skill-sources.mjs";

export type SkillSourceFile = {
  relativePath: string;
  absolutePath: string;
};
