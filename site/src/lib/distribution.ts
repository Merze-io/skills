import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { listPublishableSkillDirs, listSafeSkillFiles } from "./skill-sources";
import {
  SITE_ORIGIN,
  absolute,
  allTarUrl,
  allZipUrl,
  discoveryIndexPath,
  rawUrl,
  skillJsonUrl,
  skillPath,
  tarUrl,
  zipUrl,
} from "./routes";
import { buildTarGz, buildZip, type ArchiveFile } from "./zip";

export const DISCOVERY_SCHEMA =
  "https://schemas.agentskills.io/discovery/0.2.0/schema.json";
export const SKILLS_INDEX_SCHEMA =
  "https://skills.merze.ai/schemas/skills-index-v1.json";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_SKILL_BYTES = 20 * 1024 * 1024;
const MAX_SKILL_FILES = 500;
const MAX_ALL_ZIP_BYTES = 100 * 1024 * 1024;
const MAX_JSON_CONTENT_BYTES = 256 * 1024;

const RESERVED_SKILL_NAMES = new Set([
  "skill",
  "skills",
  "about",
  "install",
  "agents",
  "api",
  "schemas",
  "pagefind",
  "healthz",
  "llms",
  "404",
  "robots",
  "sitemap",
  "favicon",
  "logo",
  "claude",
  "_astro",
  // Collides with /files/ download tree (sandboxed text/plain)
  "files",
]);

const SKILL_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type SkillFileInfo = {
  path: string;
  absPath: string;
  bytes: Uint8Array;
  size: number;
  sha256: string;
  mediaType: string;
};

export type SkillBundle = {
  name: string;
  title: string;
  description: string;
  version: string | null;
  license: string | null;
  category: string | null;
  tags: string[];
  updatedAt: string;
  dir: string;
  files: SkillFileInfo[];
  zip: Uint8Array;
  tarGz: Uint8Array;
  zipSha256: string;
  skillMdSha256: string;
};

function sha256Hex(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function sha256Digest(data: Uint8Array): string {
  return `sha256:${sha256Hex(data)}`;
}

function isValidSkillName(name: string): boolean {
  return name.length >= 1 && name.length <= 64 && SKILL_NAME_PATTERN.test(name);
}

function mediaTypeForSkillFile(relPath: string): string {
  const ext = path.extname(relPath).toLowerCase();
  switch (ext) {
    case ".md":
      return "text/markdown";
    case ".json":
      return "application/json";
    case ".txt":
    case ".csv":
    case ".yaml":
    case ".yml":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

function parseFrontmatter(skillMd: string): {
  name: string;
  description: string;
  license: string | null;
  version: string | null;
  category: string | null;
  tags: string[];
  title: string;
} {
  const m = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error("SKILL.md missing YAML frontmatter");
  const data = parseYaml(m[1]) as Record<string, unknown>;
  if (typeof data.name !== "string" || !data.name) {
    throw new Error("SKILL.md frontmatter missing name");
  }
  if (typeof data.description !== "string" || !data.description.trim()) {
    throw new Error("SKILL.md frontmatter missing description");
  }
  const meta =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : {};
  const bodyAfter = skillMd.slice(m[0].length);
  const h1 = bodyAfter.match(/^#\s+(.+)$/m);
  const title = h1?.[1]?.trim() || data.name;
  const tags = Array.isArray(meta.tags)
    ? meta.tags.filter((t): t is string => typeof t === "string")
    : [];
  return {
    name: data.name,
    description: data.description.trim(),
    license: typeof data.license === "string" ? data.license : null,
    version: typeof meta.version === "string" ? meta.version : null,
    category: typeof meta.category === "string" ? meta.category : null,
    tags,
    title,
  };
}

/** Always UTC ISO-8601 (`…Z`), never committer-offset mixed with Z. */
function toUtcIso(value: string | number | Date): string | null {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const FALLBACK_UPDATED_AT = "1980-01-01T00:00:00.000Z";

type SkillDatesManifest = {
  skills?: Record<string, string>;
};

let cachedSkillDates: SkillDatesManifest | null | undefined;

function loadSkillDatesManifest(repoRoot: string): SkillDatesManifest | null {
  if (cachedSkillDates !== undefined) return cachedSkillDates;
  const p = path.join(repoRoot, "site", "data", "skill-dates.json");
  try {
    cachedSkillDates = JSON.parse(fs.readFileSync(p, "utf8")) as SkillDatesManifest;
  } catch {
    cachedSkillDates = null;
  }
  return cachedSkillDates;
}

/**
 * Deterministic per-skill updated_at (UTC ISO).
 * site/data/skill-dates.json is the single source of truth and always wins
 * over Coolify SOURCE_DATE / SOURCE_COMMIT_DATE / SOURCE_DATE_EPOCH (those
 * must not blanket every skill). Git log is a local/CI fallback only when the
 * manifest entry is missing; otherwise 1980.
 *
 * SOURCE_DATE_EPOCH is reserved for archive mtimes (see zip.ts), not display.
 */
export function skillUpdatedAt(skillDir: string, repoRoot: string): string {
  const name = path.basename(skillDir);
  const manifest = loadSkillDatesManifest(repoRoot);
  const fromManifest = manifest?.skills?.[name];
  if (fromManifest) {
    const iso = toUtcIso(fromManifest);
    if (iso) return iso;
  }
  try {
    const out = execFileSync(
      "git",
      ["log", "-1", "--format=%cI", "--", skillDir],
      { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    const iso = out ? toUtcIso(out) : null;
    if (iso) return iso;
  } catch {
    // no git / shallow / untracked skill folder
  }
  console.warn(
    `[distribution] no manifest/git date for ${name}; using ${FALLBACK_UPDATED_AT}`,
  );
  return FALLBACK_UPDATED_AT;
}

/** Prefer the shared helper; keep a thin alias for callers. */
export function discoverSkillDirs(repoRoot: string): string[] {
  return listPublishableSkillDirs(repoRoot);
}

export function loadSkillBundle(
  repoRoot: string,
  name: string,
): SkillBundle {
  if (!isValidSkillName(name)) {
    throw new Error(`Invalid skill name: ${name}`);
  }
  if (RESERVED_SKILL_NAMES.has(name)) {
    throw new Error(`Skill name is reserved: ${name}`);
  }
  const dir = path.join(repoRoot, name);
  // Canonical allowlist + symlink/escape policy from skill-sources.mjs
  const walked = listSafeSkillFiles(dir);
  if (walked.length === 0) throw new Error(`Skill ${name} has no files`);
  if (walked.length > MAX_SKILL_FILES) {
    throw new Error(`Skill ${name} has too many files (>${MAX_SKILL_FILES})`);
  }

  const files: SkillFileInfo[] = [];
  let total = 0;
  const caseFold = new Set<string>();
  for (const { relativePath, absolutePath } of walked) {
    const folded = relativePath.toLowerCase();
    if (caseFold.has(folded)) {
      throw new Error(
        `Case-folding path collision in ${name}: ${relativePath}`,
      );
    }
    caseFold.add(folded);
    const buf = fs.readFileSync(absolutePath);
    if (buf.length > MAX_FILE_BYTES) {
      throw new Error(
        `File too large in ${name}/${relativePath} (>${MAX_FILE_BYTES})`,
      );
    }
    total += buf.length;
    if (total > MAX_SKILL_BYTES) {
      throw new Error(`Skill ${name} exceeds ${MAX_SKILL_BYTES} bytes`);
    }
    const bytes = new Uint8Array(buf);
    files.push({
      path: relativePath,
      absPath: absolutePath,
      bytes,
      size: bytes.byteLength,
      sha256: sha256Hex(bytes),
      mediaType: mediaTypeForSkillFile(relativePath),
    });
  }

  const skillMd = files.find((f) => f.path === "SKILL.md");
  if (!skillMd) throw new Error(`Skill ${name} missing SKILL.md`);
  const fm = parseFrontmatter(new TextDecoder().decode(skillMd.bytes));
  if (fm.name !== name) {
    throw new Error(
      `Skill name/folder mismatch: frontmatter "${fm.name}" vs folder "${name}"`,
    );
  }

  const archiveFiles: ArchiveFile[] = files.map((f) => ({
    path: f.path,
    data: f.bytes,
  }));
  const zip = buildZip(archiveFiles);
  const tarGz = buildTarGz(archiveFiles);

  return {
    name,
    title: fm.title,
    description: fm.description,
    version: fm.version,
    license: fm.license,
    category: fm.category,
    tags: fm.tags,
    updatedAt: skillUpdatedAt(dir, repoRoot),
    dir,
    files,
    zip,
    tarGz,
    zipSha256: sha256Hex(zip),
    skillMdSha256: skillMd.sha256,
  };
}

function installBlock(name: string): {
  npx: string;
  npx_scoped: string;
  curl: string;
  powershell: string;
} {
  const origin = SITE_ORIGIN;
  return {
    npx: `npx skills add ${origin} --skill ${name}`,
    npx_scoped: `npx skills add ${origin}/skill/${name}`,
    curl: `mkdir -p ~/.agents/skills/${name} && curl -fsSL ${origin}/skill/${name}.tar.gz | tar -xz -C ~/.agents/skills/${name}`,
    powershell: `$d="$HOME\\.agents\\skills\\${name}"; $z="$env:TEMP\\${name}.zip"; New-Item -ItemType Directory -Force $d | Out-Null; Invoke-WebRequest ${origin}/skill/${name}.zip -OutFile $z -UseBasicParsing; Expand-Archive $z -DestinationPath $d -Force; Remove-Item $z`,
  };
}

function skillIndexEntry(b: SkillBundle) {
  return {
    name: b.name,
    title: b.title,
    description: b.description,
    version: b.version,
    license: b.license,
    category: b.category,
    tags: b.tags,
    updated_at: b.updatedAt,
    url: absolute(skillPath(b.name)),
    skill_md_url: absolute(rawUrl(b.name, "SKILL.md")),
    json_url: absolute(skillJsonUrl(b.name)),
    zip_url: absolute(zipUrl(b.name)),
    tar_gz_url: absolute(tarUrl(b.name)),
    zip_sha256: b.zipSha256,
    skill_md_sha256: b.skillMdSha256,
    files: b.files.map((f) => ({
      path: f.path,
      url: absolute(rawUrl(b.name, f.path)),
      size: f.size,
      sha256: f.sha256,
      media_type: f.mediaType,
    })),
    install: installBlock(b.name),
  };
}

export function buildSkillsIndexJson(
  bundles: SkillBundle[],
  allZipSha256: string,
): string {
  const payload = {
    $schema: SKILLS_INDEX_SCHEMA,
    schema_version: 1,
    site: {
      name: "Merze Skills",
      url: SITE_ORIGIN,
      // /install lands in PR-3; /about is the live install/contribute page today
      install_docs: `${SITE_ORIGIN}/about`,
      discovery: absolute(discoveryIndexPath()),
      all_zip: absolute(allZipUrl()),
      all_tar_gz: absolute(allTarUrl()),
      all_sha256: allZipSha256,
    },
    skills: bundles.map(skillIndexEntry),
  };
  return JSON.stringify(payload, null, 2) + "\n";
}

export function buildSkillJson(bundle: SkillBundle): string {
  const content: Record<string, string> = {};
  for (const f of bundle.files) {
    if (f.size > MAX_JSON_CONTENT_BYTES) continue;
    if (!f.mediaType.startsWith("text/") && f.mediaType !== "application/json") {
      continue;
    }
    content[f.path] = new TextDecoder().decode(f.bytes);
  }
  const payload = { ...skillIndexEntry(bundle), content };
  return JSON.stringify(payload, null, 2) + "\n";
}

export function buildDiscoveryIndex(bundles: SkillBundle[]): string {
  const skills = bundles.map((b) => {
    const hasSupport = b.files.some((f) => f.path !== "SKILL.md");
    if (hasSupport) {
      return {
        name: b.name,
        type: "archive" as const,
        description: b.description,
        url: zipUrl(b.name),
        digest: sha256Digest(b.zip),
      };
    }
    const skillMd = b.files.find((f) => f.path === "SKILL.md")!;
    return {
      name: b.name,
      type: "skill-md" as const,
      description: b.description,
      url: rawUrl(b.name, "SKILL.md"),
      digest: sha256Digest(skillMd.bytes),
    };
  });
  return (
    JSON.stringify({ $schema: DISCOVERY_SCHEMA, skills }, null, 2) + "\n"
  );
}

export function buildLlmsTxt(bundles: SkillBundle[]): string {
  const lines: string[] = [
    "# Merze Skills",
    "",
    "> Agent skills published at skills.merze.ai — install with `npx skills add https://skills.merze.ai` (no Git host required).",
    "",
    "## Skills",
    "",
  ];
  for (const b of bundles) {
    const desc = b.description.replace(/\s+/g, " ").trim();
    lines.push(
      `- [${b.title}](${absolute(rawUrl(b.name, "SKILL.md"))}): ${desc}`,
    );
  }
  // /install.md is PR-3; until then point humans at /about (no Install section with 404s)
  lines.push(
    "",
    "## Machine-readable",
    "",
    `- [skills.json](${SITE_ORIGIN}/skills.json)`,
    `- [Agent Skills discovery index](${absolute(discoveryIndexPath())})`,
    `- [All skills zip](${absolute(allZipUrl())})`,
    "",
    "## Optional",
    "",
    `- [About](${SITE_ORIGIN}/about)`,
    "",
  );
  return lines.join("\n");
}

export function buildLlmsFullTxt(bundles: SkillBundle[]): string {
  const parts: string[] = [];
  for (const b of bundles) {
    for (const f of b.files) {
      if (!f.path.endsWith(".md") && !f.path.endsWith(".markdown")) continue;
      parts.push(`<!-- file: /skill/${b.name}/${f.path} -->`);
      parts.push(new TextDecoder().decode(f.bytes).replace(/\s+$/, ""));
      parts.push("");
    }
  }
  return parts.join("\n").replace(/\s+$/, "") + "\n";
}

function writeFile(dest: string, data: Uint8Array | string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, data);
}

/**
 * Write all distribution artifacts into distDir.
 * Returns loaded bundles for callers/tests.
 */
export function writeDistributionArtifacts(
  repoRoot: string,
  distDir: string,
): SkillBundle[] {
  const names = discoverSkillDirs(repoRoot);
  const bundles = names.map((n) => loadSkillBundle(repoRoot, n));

  for (const b of bundles) {
    for (const f of b.files) {
      const dest = path.join(distDir, "skill", b.name, f.path);
      writeFile(dest, f.bytes);
    }
    writeFile(path.join(distDir, "skill", `${b.name}.zip`), b.zip);
    writeFile(path.join(distDir, "skill", `${b.name}.tar.gz`), b.tarGz);
    writeFile(path.join(distDir, "skill", `${b.name}.json`), buildSkillJson(b));
    writeFile(
      path.join(
        distDir,
        "skill",
        b.name,
        ".well-known",
        "agent-skills",
        "index.json",
      ),
      buildDiscoveryIndex([b]),
    );
  }

  const allZipFiles: ArchiveFile[] = bundles.flatMap((b) =>
    b.files.map((f) => ({ path: `${b.name}/${f.path}`, data: f.bytes })),
  );
  const allZip = buildZip(allZipFiles);
  const allTar = buildTarGz(allZipFiles);
  if (allZip.byteLength > MAX_ALL_ZIP_BYTES) {
    throw new Error(`skills.zip exceeds ${MAX_ALL_ZIP_BYTES} bytes`);
  }
  writeFile(path.join(distDir, "skills.zip"), allZip);
  writeFile(path.join(distDir, "skills.tar.gz"), allTar);

  writeFile(
    path.join(distDir, ".well-known", "agent-skills", "index.json"),
    buildDiscoveryIndex(bundles),
  );
  writeFile(
    path.join(distDir, "skills.json"),
    buildSkillsIndexJson(bundles, sha256Hex(allZip)),
  );
  writeFile(path.join(distDir, "llms.txt"), buildLlmsTxt(bundles));
  writeFile(path.join(distDir, "llms-full.txt"), buildLlmsFullTxt(bundles));

  const schemasSrc = path.join(repoRoot, "site", "schemas");
  if (fs.existsSync(schemasSrc)) {
    for (const ent of fs.readdirSync(schemasSrc)) {
      if (!ent.endsWith(".json")) continue;
      writeFile(
        path.join(distDir, "schemas", ent),
        fs.readFileSync(path.join(schemasSrc, ent)),
      );
    }
  }

  return bundles;
}
