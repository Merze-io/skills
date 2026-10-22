import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCollection, type CollectionEntry } from "astro:content";
import {
  absolutePathFromCollectionFilePath,
  isPublishableSkillFolder,
  isSafeSkillSourceFile,
  listSafeSkillFiles,
  relativePathFromCollectionId,
  type SkillSourceFile,
} from "./skill-sources";

export type SkillEntry = CollectionEntry<"skills">;
export type SupportingEntry = CollectionEntry<"supporting">;

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = path.resolve(siteRoot, "..");

function skillDirForSlug(slug: string): string {
  return path.join(repoRoot, slug);
}

/** Absolute path on disk for a content-collection entry (symlink-aware). */
function absolutePathForEntry(
  entry: { id: string; filePath?: string },
  skillSlugName: string,
): string {
  if (entry.filePath) {
    return absolutePathFromCollectionFilePath(siteRoot, entry.filePath);
  }
  return path.join(
    skillDirForSlug(skillSlugName),
    relativePathFromCollectionId(entry.id),
  );
}

function isSafeCollectionEntry(
  entry: { id: string; filePath?: string },
  skillSlugName: string,
): boolean {
  if (!isPublishableSkillFolder(skillSlugName)) return false;
  return isSafeSkillSourceFile(
    absolutePathForEntry(entry, skillSlugName),
    skillDirForSlug(skillSlugName),
  );
}

/** Allowlisted, non-symlink files for a skill (install + /files/ parity). */
export function getPublishedSkillFiles(slug: string): SkillSourceFile[] {
  return listSafeSkillFiles(skillDirForSlug(slug));
}

export type DescriptionParts = {
  summary: string;
  useWhen: string[];
  notFor: string[];
  fallbackFull?: string;
};

const USE_WHEN = /^(use when|use for)\b/i;
// "Do not use…", "Not for…", or short constraint sentences ending in "only."
const NOT_FOR = /^(do not use|not for)\b/i;
const ONLY_CONSTRAINT = /^[^.!?]{1,40}\bonly\.?$/i;

function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseDescription(description: string): DescriptionParts {
  const sentences = splitSentences(description);
  const useWhen: string[] = [];
  const notFor: string[] = [];
  const rest: string[] = [];

  for (const sentence of sentences) {
    if (USE_WHEN.test(sentence)) {
      useWhen.push(sentence);
    } else if (NOT_FOR.test(sentence) || ONLY_CONSTRAINT.test(sentence)) {
      notFor.push(sentence);
    } else {
      rest.push(sentence);
    }
  }

  if (useWhen.length === 0 && notFor.length === 0) {
    return {
      summary: description.trim(),
      useWhen: [],
      notFor: [],
      fallbackFull: description.trim(),
    };
  }

  return {
    summary: rest.join(" ").trim() || description.trim(),
    useWhen,
    notFor,
  };
}

export function extractWhenToUseFromBody(body: string): string | null {
  const match = body.match(
    /##\s+When to use\s*\n+([\s\S]*?)(?=\n##\s|\n#\s|$)/i,
  );
  if (!match) return null;
  return match[1].trim() || null;
}

export function folderNameFromSkillId(id: string): string {
  // Astro glob id is typically "us-llc-state-cost/SKILL" or similar
  const cleaned = id.replace(/\\/g, "/");
  const parts = cleaned.split("/");
  if (parts.length >= 2) return parts[0];
  return cleaned.replace(/\/SKILL$/i, "").replace(/\.md$/i, "");
}

export function skillSlug(entry: SkillEntry): string {
  return folderNameFromSkillId(entry.id);
}

export function validateSkillEntry(entry: SkillEntry): void {
  const folder = skillSlug(entry);
  if (entry.data.name !== folder) {
    throw new Error(
      `Skill name/folder mismatch: frontmatter name "${entry.data.name}" does not match folder "${folder}" (entry id: ${entry.id})`,
    );
  }
  if (!entry.data.metadata?.version) {
    console.warn(
      `[skills] warning: missing metadata.version in ${folder}/SKILL.md`,
    );
  }
}

export async function getAllSkills(): Promise<SkillEntry[]> {
  const entries = await getCollection("skills", (entry) => {
    const slug = folderNameFromSkillId(entry.id);
    return isSafeCollectionEntry(entry, slug);
  });
  for (const entry of entries) {
    validateSkillEntry(entry);
  }
  return entries.sort((a, b) =>
    skillSlug(a).localeCompare(skillSlug(b), "en"),
  );
}

export function supportingSkillSlug(entry: SupportingEntry): string {
  const cleaned = entry.id.replace(/\\/g, "/");
  return cleaned.split("/")[0];
}

export function supportingFileSlug(entry: SupportingEntry): string {
  const cleaned = entry.id.replace(/\\/g, "/");
  const file = cleaned.split("/").pop() ?? cleaned;
  return file.replace(/\.md$/i, "").replace(/\/SKILL$/i, "");
}

export function isSkillMarkdown(entry: SupportingEntry): boolean {
  const file = supportingFileSlug(entry).toLowerCase();
  return file === "skill";
}

export async function getSupportingFiles(
  skillSlugName: string,
): Promise<SupportingEntry[]> {
  const entries = await getCollection("supporting", (entry) => {
    const slug = supportingSkillSlug(entry);
    return (
      slug === skillSlugName &&
      !isSkillMarkdown(entry) &&
      isSafeCollectionEntry(entry, slug)
    );
  });
  return entries.sort((a, b) =>
    supportingFileSlug(a).localeCompare(supportingFileSlug(b), "en"),
  );
}

/** Site-local download for a skill file (served from dist at build time). */
export function skillFileUrl(slug: string, path = "SKILL.md"): string {
  const cleaned = path.replace(/^\/+/, "");
  return `/files/${slug}/${cleaned}`;
}

/**
 * Generic install hint — download every published file for the skill from
 * this domain into the agent's skills folder.
 */
export function installHint(slug: string): string {
  return `Download every file under ${skillFileUrl(slug, "").replace(/\/$/, "")}/ into your agent's skills directory as ${slug}/.`;
}

/** Optional last-updated from Coolify/build env; omit when absent. */
export function getSourceUpdatedAt(): string | null {
  const date =
    (import.meta.env.SOURCE_DATE as string | undefined) ||
    (import.meta.env.SOURCE_COMMIT_DATE as string | undefined) ||
    "";
  if (!date.trim()) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date.trim();
  return parsed.toISOString();
}

export function formatUpdated(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export type SkillListItem = {
  slug: string;
  name: string;
  summary: string;
  version: string | null;
  category: string | null;
  tags: string[];
  hasSupporting: boolean;
  updatedAt: string | null;
  description: string;
};

export async function getSkillListItems(): Promise<SkillListItem[]> {
  const skills = await getAllSkills();
  const updatedAt = getSourceUpdatedAt();
  const items: SkillListItem[] = [];

  for (const skill of skills) {
    const slug = skillSlug(skill);
    const parts = parseDescription(skill.data.description);
    const supporting = await getSupportingFiles(slug);
    items.push({
      slug,
      name: skill.data.name,
      summary: parts.summary,
      version: skill.data.metadata?.version ?? null,
      category: skill.data.metadata?.category ?? null,
      tags: skill.data.metadata?.tags ?? [],
      hasSupporting: supporting.length > 0,
      updatedAt,
      description: skill.data.description,
    });
  }

  return items;
}
