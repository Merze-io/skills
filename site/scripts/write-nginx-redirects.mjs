#!/usr/bin/env node
/**
 * Generate dist-nginx/skills-redirects.conf and scripts/redirect-cases.tsv
 * from publishable skill folders. Consumed by nginx (Dockerfile) and docker-smoke.
 *
 * Captures are restricted to safe path characters so Location never contains
 * `\`, control chars, or `//…` open-redirect forms.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listPublishableSkillDirs } from "../src/lib/skill-sources.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(siteRoot, "..");
const outDir = path.join(siteRoot, "dist-nginx");
const outPath = path.join(outDir, "skills-redirects.conf");
const casesPath = path.join(__dirname, "redirect-cases.tsv");
const checkOnly = process.argv.includes("--check");

/** Safe path charset for nginx captures (aligned with skill-sources segments + /). */
const SAFE_PATH = "[A-Za-z0-9._/-]";
/** strip_slash: first char after / must be alnum; then safe path chars (incl. ~). */
const SAFE_STRIP = "[A-Za-z0-9][A-Za-z0-9._~/-]*";

const names = listPublishableSkillDirs(repoRoot);

const legacyLines = [
  '    default "";',
  // Only non-canonical about forms (not bare /about)
  '    ~^/about/(?:index\\.html)?$                                       /about;',
];
const caseLines = ['    default "";'];
const filesLines = ['    default "";'];

/** @type {string[]} */
const cases = [
  "# request\tstatus\tlocation (empty = no Location; 200/404)",
  "/\t200\t",
  "/about\t200\t",
  "/about/\t301\t/about",
  "/about/index.html\t301\t/about",
  "/about/?x=1\t301\t/about?x=1",
  "/healthz\t200\t",
  "/skills.json\t200\t",
  // Open-redirect probes — must 404 (never 301 with \\, TAB, CR, LF, or //)
  "/%5Cevil.com/\t404\t",
  "/%09/evil.com/\t404\t",
  "/%0Devil.com\t404\t",
  "/%0Aevil.com\t404\t",
  "//evil.com/\t404\t",
  "//evil.com\t404\t",
];

/**
 * Reject Location targets that could become open redirects.
 * @param {string} loc
 */
function assertSafeLocation(loc) {
  if (!loc) return;
  if (loc.startsWith("//") || loc.includes("\\") || /[\x00-\x1f\x7f]/.test(loc)) {
    throw new Error(`unsafe Location target: ${JSON.stringify(loc)}`);
  }
  if (!loc.startsWith("/")) {
    throw new Error(`Location must be root-relative: ${JSON.stringify(loc)}`);
  }
}

for (const name of names) {
  // Legacy catalog pages → /skill/<name>[/<doc>]
  legacyLines.push(
    `    ~^/${name}(?:/|/index\\.html)?$                       /skill/${name};`,
  );
  legacyLines.push(
    `    ~^/${name}/(?<d>[A-Za-z0-9._-]+?)(?:/|/index\\.html)?$   /skill/${name}/$d;`,
  );

  // /files/<name>/… → /skill/<name>/… ; bare /files/<name>/ → SKILL.md
  // Trailing slash on file path stripped here so /files/<name>/<file>/ is one hop.
  filesLines.push(
    `    ~^/files/${name}/?$                                   /skill/${name}/SKILL.md;`,
  );
  filesLines.push(
    `    ~^/files/${name}/(?<p>${SAFE_PATH}+?)/?$              /skill/${name}/$p;`,
  );

  // Case-normalize only the skill segment under /skill/
  caseLines.push(
    `    ~^/skill/${name}(?:[/.]|$)                           "";`,
  );
  caseLines.push(
    `    ~*^/skill/${name}(?<r>(?:[/.]${SAFE_PATH}*[A-Za-z0-9._-])?)/?$  /skill/${name}$r;`,
  );

  const upper = name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("-");

  cases.push(`/${name}\t301\t/skill/${name}`);
  cases.push(`/${name}/\t301\t/skill/${name}`);
  cases.push(`/${name}/index.html\t301\t/skill/${name}`);
  cases.push(`/${name}?x=1\t301\t/skill/${name}?x=1`);
  cases.push(`/skill/${name}\t200\t`);
  cases.push(`/skill/${name}/\t301\t/skill/${name}`);
  cases.push(`/skill/${name}/SKILL.md\t200\t`);
  cases.push(`/skill/${name}/SKILL.MD\t404\t`);
  cases.push(`/skill/${upper}\t301\t/skill/${name}`);
  cases.push(`/skill/${upper}/states\t301\t/skill/${name}/states`);
  cases.push(`/files/${name}/\t301\t/skill/${name}/SKILL.md`);
  cases.push(`/files/${name}\t301\t/skill/${name}/SKILL.md`);
  cases.push(`/files/${name}/SKILL.md\t301\t/skill/${name}/SKILL.md`);
  cases.push(`/files/${name}/SKILL.md/\t301\t/skill/${name}/SKILL.md`);
  cases.push(`/files/${name}/states.md\t301\t/skill/${name}/states.md`);
  cases.push(`/files/${name}/states.md/\t301\t/skill/${name}/states.md`);
  cases.push(`/files/${name}/states.md?x=1\t301\t/skill/${name}/states.md?x=1`);
  // CR/LF in path segment must not become Location
  cases.push(`/files/${name}/a%0d\t404\t`);
  cases.push(`/files/${name}/a%0a\t404\t`);
  cases.push(`/skill/${upper}/a%0d\t404\t`);

  // Supporting docs from the skill folder (extensionless rendered pages)
  const skillDir = path.join(repoRoot, name);
  for (const ent of fs.readdirSync(skillDir)) {
    if (!ent.endsWith(".md") || ent === "SKILL.md") continue;
    const doc = ent.replace(/\.md$/i, "");
    cases.push(`/${name}/${doc}\t301\t/skill/${name}/${doc}`);
    cases.push(`/${name}/${doc}/\t301\t/skill/${name}/${doc}`);
    cases.push(`/${name}/${doc}/index.html\t301\t/skill/${name}/${doc}`);
    cases.push(`/skill/${name}/${doc}\t200\t`);
    cases.push(`/skill/${name}/${doc}/\t301\t/skill/${name}/${doc}`);
    cases.push(`/skill/${name}/${ent}\t200\t`);
  }
}

const conf = `# GENERATED by site/scripts/write-nginx-redirects.mjs — do not edit
map $uri $legacy_redirect {
${legacyLines.join("\n")}
}
map $uri $files_redirect {
${filesLines.join("\n")}
}
map $uri $skill_case_redirect {
${caseLines.join("\n")}
}
map $uri $strip_slash {
    default "";
    /index.html                /;
    ~^(?<p>/${SAFE_STRIP})/index\\.html$   $p;
    ~^(?<p>/${SAFE_STRIP})/$              $p;
}
`;

for (const line of cases) {
  if (!line || line.startsWith("#")) continue;
  const loc = line.split("\t")[2] ?? "";
  assertSafeLocation(loc);
}
for (const block of [legacyLines, filesLines, caseLines]) {
  for (const line of block) {
    const m = line.match(/^\s+~\S+\s+(\S+);$/);
    if (!m) continue;
    const loc = m[1].replace(/^"|"$/g, "");
    if (loc === '""' || loc === "") continue;
    // Skip map defaults / empty string markers
    if (loc.includes("$")) {
      // Capture expansions are constrained by SAFE_* char classes above.
      continue;
    }
    assertSafeLocation(loc);
  }
}

const casesBody = cases.join("\n") + "\n";

if (checkOnly) {
  if (!fs.existsSync(casesPath)) {
    console.error(`redirect-cases.tsv missing at ${casesPath}`);
    process.exit(1);
  }
  const prev = fs.readFileSync(casesPath, "utf8");
  if (prev !== casesBody) {
    console.error(
      "redirect-cases.tsv is stale. Run: node site/scripts/write-nginx-redirects.mjs",
    );
    process.exit(1);
  }
  console.log(`redirect-cases.tsv OK (${names.length} skill(s))`);
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, conf);
fs.writeFileSync(casesPath, casesBody);
console.log(`wrote ${outPath} (${names.length} skill(s))`);
console.log(`wrote ${casesPath}`);
