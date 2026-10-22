#!/usr/bin/env node
/**
 * Verify distribution artifacts under site/dist against skill sources and schemas.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { unzipSync } from "fflate";
import Ajv2020 from "ajv/dist/2020.js";
import {
  assertSafeSkillRelativePath,
  listPublishableSkillDirs,
  listSafeSkillFiles,
} from "../src/lib/skill-sources.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(siteRoot, "..");
const distDir = path.join(siteRoot, "dist");

function sha256Hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function fail(msg) {
  console.error(`verify-dist: ${msg}`);
  process.exit(1);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function cmpBytes(a, b, label) {
  if (Buffer.compare(Buffer.from(a), Buffer.from(b)) !== 0) {
    fail(`byte mismatch: ${label}`);
  }
}

function extractZip(buf) {
  const entries = unzipSync(new Uint8Array(buf));
  const map = new Map();
  for (const [name, data] of Object.entries(entries)) {
    if (name.endsWith("/")) continue;
    map.set(name, data);
  }
  return map;
}

function extractTarGz(buf) {
  const tar = gunzipSync(Buffer.from(buf));
  const map = new Map();
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const sizeText = header
      .subarray(124, 136)
      .toString("utf8")
      .replace(/\0.*$/, "")
      .trim();
    const modeText = header
      .subarray(100, 108)
      .toString("utf8")
      .replace(/\0.*$/, "")
      .trim();
    const typeFlag = header[156];
    const prefix = header
      .subarray(345, 500)
      .toString("utf8")
      .replace(/\0.*$/, "");
    const full = prefix ? `${prefix}/${name}` : name;
    const size = Number.parseInt(sizeText || "0", 8);
    const mode = Number.parseInt(modeText || "0", 8);
    offset += 512;
    if (typeFlag === 0 || typeFlag === 48) {
      map.set(full, { data: tar.subarray(offset, offset + size), mode });
    }
    offset += Math.ceil(size / 512) * 512;
  }
  return map;
}

/** Per-entry path rules (plan §6) — same as skill-sources. */
function assertArchiveEntryName(name, label) {
  // skills.zip / skills.tar.gz use <skill>/<path>; per-skill archives are root paths
  const parts = name.split("/");
  const check =
    parts.length >= 2 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(parts[0])
      ? parts.slice(1).join("/")
      : name;
  try {
    assertSafeSkillRelativePath(check);
  } catch (e) {
    fail(`${label}: bad archive entry ${JSON.stringify(name)}: ${e.message}`);
  }
}

function assertArchiveMatches(map, expected, label, { modes } = {}) {
  const keys = [...map.keys()].sort();
  const expKeys = Object.keys(expected).sort();
  if (JSON.stringify(keys) !== JSON.stringify(expKeys)) {
    fail(
      `${label}: entry mismatch\n  got: ${keys.join(", ")}\n  exp: ${expKeys.join(", ")}`,
    );
  }
  for (const k of keys) {
    assertArchiveEntryName(k, label);
    const entry = map.get(k);
    const data = entry?.data !== undefined ? entry.data : entry;
    cmpBytes(data, expected[k], `${label}:${k}`);
    if (modes && entry?.mode !== undefined && entry.mode !== 0o644) {
      fail(`${label}:${k}: mode ${entry.mode.toString(8)} != 644`);
    }
  }
}

const skills = listPublishableSkillDirs(repoRoot);
if (skills.length === 0) fail("no skills found");

const expectedBySkill = {};
for (const name of skills) {
  const walked = listSafeSkillFiles(path.join(repoRoot, name));
  expectedBySkill[name] = {};
  for (const { relativePath, absolutePath } of walked) {
    assertSafeSkillRelativePath(relativePath);
    const src = fs.readFileSync(absolutePath);
    const dest = path.join(distDir, "skill", name, relativePath);
    if (!fs.existsSync(dest)) {
      fail(`missing raw file: skill/${name}/${relativePath}`);
    }
    const got = fs.readFileSync(dest);
    cmpBytes(src, got, `raw skill/${name}/${relativePath}`);
    expectedBySkill[name][relativePath] = src;
  }
}

for (const name of skills) {
  const zipPath = path.join(distDir, "skill", `${name}.zip`);
  const tarPath = path.join(distDir, "skill", `${name}.tar.gz`);
  if (!fs.existsSync(zipPath)) fail(`missing ${name}.zip`);
  if (!fs.existsSync(tarPath)) fail(`missing ${name}.tar.gz`);
  assertArchiveMatches(
    extractZip(fs.readFileSync(zipPath)),
    expectedBySkill[name],
    `${name}.zip`,
  );
  assertArchiveMatches(
    extractTarGz(fs.readFileSync(tarPath)),
    expectedBySkill[name],
    `${name}.tar.gz`,
    { modes: true },
  );
}

const allExpected = {};
for (const name of skills) {
  for (const [rel, buf] of Object.entries(expectedBySkill[name])) {
    allExpected[`${name}/${rel}`] = buf;
  }
}
assertArchiveMatches(
  extractZip(fs.readFileSync(path.join(distDir, "skills.zip"))),
  allExpected,
  "skills.zip",
);
assertArchiveMatches(
  extractTarGz(fs.readFileSync(path.join(distDir, "skills.tar.gz"))),
  allExpected,
  "skills.tar.gz",
  { modes: true },
);

const indexPath = path.join(
  distDir,
  ".well-known",
  "agent-skills",
  "index.json",
);
if (!fs.existsSync(indexPath)) fail("missing discovery index");
const discovery = readJson(indexPath);

const skillsIndex = readJson(path.join(distDir, "skills.json"));
if (skillsIndex.schema_version !== 1) fail("skills.json schema_version != 1");
if (
  "github" in skillsIndex ||
  "source" in skillsIndex ||
  "generatedAt" in skillsIndex
) {
  fail("skills.json must not contain github/source/generatedAt");
}
const blob = JSON.stringify(skillsIndex);
if (/\bgithub\b/i.test(blob)) {
  fail("skills.json contains the substring 'github'");
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
const discoverySchema = readJson(
  path.join(siteRoot, "schemas", "discovery-0.2.0.json"),
);
const skillsSchema = readJson(
  path.join(siteRoot, "schemas", "skills-index-v1.json"),
);
const validateDiscovery = ajv.compile(discoverySchema);
const validateSkills = ajv.compile(skillsSchema);
if (!validateDiscovery(discovery)) {
  fail(`discovery index schema: ${ajv.errorsText(validateDiscovery.errors)}`);
}
if (!validateSkills(skillsIndex)) {
  fail(`skills.json schema: ${ajv.errorsText(validateSkills.errors)}`);
}

for (const entry of discovery.skills) {
  const urlPath = entry.url.startsWith("http")
    ? new URL(entry.url).pathname
    : entry.url;
  const artifact = path.join(distDir, urlPath.replace(/^\//, ""));
  if (!fs.existsSync(artifact)) fail(`discovery artifact missing: ${urlPath}`);
  const dig = `sha256:${sha256Hex(fs.readFileSync(artifact))}`;
  if (dig !== entry.digest) {
    fail(`digest mismatch for ${entry.name}: ${dig} != ${entry.digest}`);
  }
}

for (const s of skillsIndex.skills) {
  for (const f of s.files) {
    assertSafeSkillRelativePath(f.path);
    const p = path.join(distDir, "skill", s.name, f.path);
    const buf = fs.readFileSync(p);
    if (buf.length !== f.size) fail(`size mismatch ${s.name}/${f.path}`);
    if (sha256Hex(buf) !== f.sha256) fail(`sha256 mismatch ${s.name}/${f.path}`);
  }
  const zipBuf = fs.readFileSync(path.join(distDir, "skill", `${s.name}.zip`));
  if (sha256Hex(zipBuf) !== s.zip_sha256) fail(`zip_sha256 mismatch ${s.name}`);

  const skillJsonPath = path.join(distDir, "skill", `${s.name}.json`);
  if (!fs.existsSync(skillJsonPath)) fail(`missing /skill/${s.name}.json`);
  const skillJson = readJson(skillJsonPath);
  if (skillJson.name !== s.name) fail(`skill json name mismatch ${s.name}`);
  if (skillJson.zip_sha256 !== s.zip_sha256) {
    fail(`skill json zip_sha256 mismatch ${s.name}`);
  }
}

const nameRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
for (const name of skills) {
  if (!nameRe.test(name) || name.length > 64) fail(`bad skill name: ${name}`);
}

for (const name of skills) {
  const scoped = path.join(
    distDir,
    "skill",
    name,
    ".well-known",
    "agent-skills",
    "index.json",
  );
  if (!fs.existsSync(scoped)) fail(`missing scoped discovery for ${name}`);
  const scopedIdx = readJson(scoped);
  if (!validateDiscovery(scopedIdx)) {
    fail(`scoped discovery schema ${name}`);
  }
  if (scopedIdx.skills.length !== 1 || scopedIdx.skills[0].name !== name) {
    fail(`scoped discovery should contain only ${name}`);
  }
  const entry = scopedIdx.skills[0];
  const urlPath = entry.url.startsWith("http")
    ? new URL(entry.url).pathname
    : entry.url;
  const artifact = path.join(distDir, urlPath.replace(/^\//, ""));
  const dig = `sha256:${sha256Hex(fs.readFileSync(artifact))}`;
  if (dig !== entry.digest) {
    fail(`scoped digest mismatch for ${name}: ${dig} != ${entry.digest}`);
  }
}

for (const f of ["llms.txt", "llms-full.txt"]) {
  if (!fs.existsSync(path.join(distDir, f))) fail(`missing ${f}`);
}

// Every published skill file under dist/skill/<name>/ must be allowlisted
for (const name of skills) {
  const skillDist = path.join(distDir, "skill", name);
  function walkDist(dir, base = "") {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === ".well-known") continue;
      const rel = base ? `${base}/${ent.name}` : ent.name;
      const abs = path.join(dir, ent.name);
      if (ent.isSymbolicLink()) {
        fail(`symlink in dist skill tree: skill/${name}/${rel}`);
      }
      if (ent.isDirectory()) walkDist(abs, rel);
      else if (ent.isFile()) {
        assertSafeSkillRelativePath(rel);
        const ext = path.extname(rel).toLowerCase();
        if (!/\.(md|txt|json|ya?ml|csv)$/i.test(rel)) {
          fail(`disallowed extension in dist: skill/${name}/${rel} (${ext})`);
        }
      }
    }
  }
  walkDist(skillDist);
}

console.log(
  `verify-dist: OK (${skills.length} skill(s), discovery + skills.json validated)`,
);
