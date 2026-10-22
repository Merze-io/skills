/**
 * Typed re-export of the shared skill publishing rules.
 * Implementation lives in `./skill-sources.mjs` so Node build scripts and
 * Astro/TS share one allowlist + symlink policy (also for MER-1098).
 */
export {
  ALLOWED_SKILL_FILE_EXT,
  isAllowedSkillFileName,
  isPublishableSkillFolder,
  listPublishableSkillDirs,
  listSafeSkillFiles,
} from "./skill-sources.mjs";

export type SkillSourceFile = {
  relativePath: string;
  absolutePath: string;
};
