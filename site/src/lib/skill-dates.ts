/**
 * Single loader for site/data/skill-dates.json.
 * Fail closed: missing or invalid manifest throws (build must not proceed).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export type SkillDatesManifest = {
  skills: Record<string, string>;
};

let cached: SkillDatesManifest | undefined;

function manifestPath(repoRoot?: string): string {
  return repoRoot
    ? path.join(repoRoot, "site", "data", "skill-dates.json")
    : path.join(siteRoot, "data", "skill-dates.json");
}

/**
 * Read and validate skill-dates.json.
 * @throws if missing, unparseable, or missing a valid `skills` map
 */
export function readSkillDates(repoRoot?: string): SkillDatesManifest {
  if (cached && !repoRoot) return cached;
  const p = manifestPath(repoRoot);
  if (!fs.existsSync(p)) {
    throw new Error(
      `skill-dates.json missing at ${p}. Run: node site/scripts/generate-skill-dates.mjs`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (err) {
    throw new Error(
      `skill-dates.json unparseable at ${p}: ${err instanceof Error ? err.message : err}`,
    );
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("skills" in parsed) ||
    typeof (parsed as { skills: unknown }).skills !== "object" ||
    (parsed as { skills: unknown }).skills === null ||
    Array.isArray((parsed as { skills: unknown }).skills)
  ) {
    throw new Error(
      `skill-dates.json invalid at ${p}: expected { skills: Record<string, string> }`,
    );
  }
  const skills = (parsed as { skills: Record<string, unknown> }).skills;
  for (const [name, raw] of Object.entries(skills)) {
    if (typeof raw !== "string" || Number.isNaN(Date.parse(raw))) {
      throw new Error(
        `skill-dates.json invalid date for ${name}: ${JSON.stringify(raw)}`,
      );
    }
  }
  const manifest: SkillDatesManifest = {
    skills: skills as Record<string, string>,
  };
  if (!repoRoot) cached = manifest;
  return manifest;
}
