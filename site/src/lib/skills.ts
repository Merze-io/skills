import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCollection, type CollectionEntry } from "astro:content";
import {
  isPublishableSkillFolder,
  isSafeSkillSourceFile,
  listSafeSkillFiles,
  type SkillSourceFile,
} from "./skill-sources";
import { readSkillDates } from "./skill-dates";

export type SkillEntry = CollectionEntry<"skills">;
export type SupportingEntry = CollectionEntry<"supporting">;

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = path.resolve(siteRoot, "..");

function skillDirForSlug(slug: string): string {
  return path.join(repoRoot, slug);
}

function isSafeCollectionEntry(
  entry: { id: string; filePath?: string },
  skillSlugName: string,
): boolean {
  if (!isPublishableSkillFolder(skillSlugName)) return false;
  // Astro 5 glob loader always sets filePath.
  if (!entry.filePath) return false;
  return isSafeSkillSourceFile(
    path.resolve(siteRoot, entry.filePath),
    skillDirForSlug(skillSlugName),
  );
}

/** Encode each path segment for /skill/<name>/… URLs (and install curl args). */
export function encodeSkillFilePath(filePath: string): string {
  return filePath
    .replace(/^\/+/, "")
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

/** Single-quote for safe embedding in generated shell install commands. */
export function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Allowlisted, non-symlink files for a skill (install + /skill/ raw parity). */
export function getPublishedSkillFiles(slug: string): SkillSourceFile[] {
  return listSafeSkillFiles(skillDirForSlug(slug));
}

/**
 * Per-skill updated_at from committed skill-dates.json only.
 * Manifest must exist and parse (readSkillDates fails closed).
 */
export function getSkillUpdatedAt(slug: string): string | null {
  const raw = readSkillDates().skills[slug];
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
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

/** Site-local raw skill file URL (canonical /skill/<name>/…; /files/ 301s here). */
export function skillFileUrl(slug: string, filePath = "SKILL.md"): string {
  return `/skill/${encodeSkillFilePath(slug)}/${encodeSkillFilePath(filePath)}`;
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
  title: string;
  summary: string;
  version: string | null;
  category: string | null;
  tags: string[];
  hasSupporting: boolean;
  updatedAt: string | null;
  description: string;
};

/** Human label for catalog and detail pages; falls back to the machine name. */
export function displayTitle(skill: SkillEntry | { data: { title?: string; name: string } }): string {
  const title = skill.data.title?.trim();
  return title || skill.data.name;
}

export async function getSkillListItems(): Promise<SkillListItem[]> {
  const skills = await getAllSkills();
  const items: SkillListItem[] = [];

  for (const skill of skills) {
    const slug = skillSlug(skill);
    const parts = parseDescription(skill.data.description);
    const supporting = await getSupportingFiles(slug);
    items.push({
      slug,
      name: skill.data.name,
      title: displayTitle(skill),
      summary: parts.summary,
      version: skill.data.metadata?.version ?? null,
      category: skill.data.metadata?.category ?? null,
      tags: skill.data.metadata?.tags ?? [],
      hasSupporting: supporting.length > 0,
      updatedAt: getSkillUpdatedAt(slug),
      description: skill.data.description,
    });
  }

  return items;
}
