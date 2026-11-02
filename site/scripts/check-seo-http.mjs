#!/usr/bin/env node
/** Read-only HTTP discovery checks. No dependencies, redirect following, or retries.
 * Defaults target the local Docker smoke origin. --origin can target a live edge;
 * --canonical-origin describes published URLs (not the local transport address).
 * --profile production-edge additionally preserves the audited training exclusions.
 * Bounds: 2 MiB/response, 10 s/request, 20 sitemap documents, 500 pages,
 * 2,000 requests. Serial requests; raw-file/subpage probes spaced by 2.1 s to
 * respect rl_raw (30/min). No archives, install commands, or synthetic bot claims.
 */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const QUERY = "?seo_probe=1&value=a%2Fb";
const SEARCH_BOTS = ["Googlebot", "Bingbot", "OAI-SearchBot", "PerplexityBot", "Claude-SearchBot", "ChatGPT-User"];
const TRAINING_BOTS = ["GPTBot", "ClaudeBot", "Google-Extended"];

function originOnly(value) {
  const url = new URL(value);
  assert(["http:", "https:"].includes(url.protocol) && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash, `Expected an HTTP origin: ${value}`);
  return url.origin;
}

/** Robots group matching: most-specific agent token, then longest path rule;
 * Allow wins a length tie. Handles *, terminal $, duplicate groups and comments.
 */
export function robotsAllows(body, agent, pathname) {
  const groups = [];
  let group;
  for (const line of body.split(/\r?\n/)) {
    const match = line.replace(/#.*/, "").match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/);
    if (!match) continue;
    const [, rawKey, value] = match;
    const key = rawKey.toLowerCase();
    if (key === "user-agent") {
      if (!group || group.hasRules) groups.push(group = { agents: [], rules: [], hasRules: false });
      group.agents.push(value.toLowerCase());
    } else if (group && ["allow", "disallow"].includes(key)) {
      group.hasRules = true;
      if (value) group.rules.push({ allow: key === "allow", value });
    }
  }
  const scored = groups.map(g => ({ ...g, score: Math.max(-1, ...g.agents.map(a => a === "*" ? 0 : agent.toLowerCase().includes(a) ? a.length : -1)) }));
  const best = Math.max(-1, ...scored.map(g => g.score));
  const rules = scored.filter(g => g.score === best && best >= 0).flatMap(g => g.rules).filter(r => {
    const end = r.value.endsWith("$");
    const pattern = (end ? r.value.slice(0, -1) : r.value).split("*").map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    return new RegExp(`^${pattern}${end ? "$" : ""}`).test(pathname);
  }).sort((a, b) => b.value.replace(/[*$]/g, "").length - a.value.replace(/[*$]/g, "").length || Number(b.allow) - Number(a.allow));
  return rules[0]?.allow ?? true;
}

function xmlLocations(body) {
  assert(!/<!DOCTYPE|<!ENTITY/i.test(body), "Sitemap must not declare entities");
  return [...body.matchAll(/<loc\s*>([^<]+)<\/loc>/g)].map(m => m[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
}

function security(response, label) {
  assert.equal(response.headers.get("x-content-type-options"), "nosniff", `${label}: nosniff`);
  assert(response.headers.get("content-security-policy"), `${label}: CSP missing`);
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin", `${label}: referrer policy`);
}

export async function checkSeoHttp({
  origin = "http://127.0.0.1:18080", canonicalOrigin = "https://skills.merze.ai",
  profile = "origin", maxRequests = 2000, maxPages = 500, maxSitemaps = 20,
  maxBytes = 2 * 1024 * 1024, timeoutMs = 10_000, rawIntervalMs = 2100,
} = {}) {
  origin = originOnly(origin);
  canonicalOrigin = originOnly(canonicalOrigin);
  assert(["origin", "production-edge"].includes(profile), `Unknown profile: ${profile}`);
  for (const [name, value] of Object.entries({ maxRequests, maxPages, maxSitemaps, maxBytes, timeoutMs })) {
    assert(Number.isSafeInteger(value) && value > 0, `Invalid ${name}`);
  }
  assert(Number.isFinite(rawIntervalMs) && rawIntervalMs >= 0, "Invalid rawIntervalMs");
  let requests = 0;
  let lastRaw = 0;
  const checked = new Map();
  const publishedPath = (value) => {
    const url = new URL(value);
    assert.equal(url.origin, canonicalOrigin, `Cross-host inventory URL: ${value}`);
    assert(!url.username && !url.password && !url.search && !url.hash && !url.pathname.startsWith("//"), `Noncanonical inventory URL: ${value}`);
    return url.pathname;
  };
  async function request(pathname, method = "GET") {
    assert(pathname.startsWith("/") && !pathname.startsWith("//"), `Unsafe probe path: ${pathname}`);
    const url = new URL(pathname, origin);
    assert.equal(url.origin, origin, "Probe escaped transport origin");
    assert(++requests <= maxRequests, `Request budget exceeded (${maxRequests})`);
    if (/^\/skill\/[^/]+\//.test(url.pathname)) {
      await sleep(Math.max(0, rawIntervalMs - (Date.now() - lastRaw)));
      lastRaw = Date.now();
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { method, redirect: "manual", signal: controller.signal, headers: { "User-Agent": "Merze-SEO-HTTP-Check/1.0", "Accept-Encoding": "identity" } });
      let size = 0;
      const chunks = [];
      for await (const chunk of response.body ?? []) {
        size += chunk.length;
        assert(size <= maxBytes, `${method} ${pathname}: response exceeds ${maxBytes} bytes`);
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString("utf8");
      if (method === "HEAD") assert.equal(size, 0, `${pathname}: HEAD body`);
      return { status: response.status, headers: response.headers, body };
    } catch (error) {
      throw new Error(`${method} ${pathname}: ${error.message}`, { cause: error });
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
  async function ok(pathname, method = "GET", mime) {
    const key = `${method} ${pathname}`;
    if (!checked.has(key)) checked.set(key, await request(pathname, method));
    const response = checked.get(key);
    assert.equal(response.status, 200, `${key}: expected 200, got ${response.status}`);
    assert(!response.headers.has("location"), `${key}: unexpected Location`);
    if (mime) assert.match(response.headers.get("content-type") ?? "", mime, `${key}: MIME`);
    return response;
  }
  async function redirect(from, to, method, requireSecurity = false) {
    const response = await request(from, method);
    assert([301, 308].includes(response.status), `${method} ${from}: expected permanent redirect, got ${response.status}`);
    assert.equal(response.headers.get("location"), to, `${method} ${from}: exact relative Location`);
    if (requireSecurity) security(response, from);
    return ok(to, method); // Exactly one hop, never follow an arbitrary Location.
  }

  const catalog = JSON.parse((await ok("/skills.json", "GET", /^application\/json\b/i)).body);
  assert(Array.isArray(catalog.skills) && catalog.skills.length > 0, "Empty catalog");
  const expected = new Set(["/", "/about"]);
  const skills = [];
  for (const skill of catalog.skills) {
    assert.match(skill.name, /^[a-z0-9-]{1,64}$/);
    const pathname = `/skill/${skill.name}`;
    assert.equal(publishedPath(skill.url), pathname);
    assert.equal(publishedPath(skill.skill_md_url), `${pathname}/SKILL.md`);
    assert(!expected.has(pathname), `Duplicate skill: ${pathname}`);
    expected.add(pathname);
    assert(Array.isArray(skill.files), `${pathname}: files missing`);
    for (const file of skill.files) {
      // Mirrors the current one-level supporting collection; nested files are raw only.
      if (file.path !== "SKILL.md" && /^[^/]+\.md$/.test(file.path)) {
        expected.add(`${pathname}/${file.path.slice(0, -3)}`);
      }
    }
    skills.push(pathname);
  }
  assert(expected.size <= maxPages, `Page budget exceeded (${maxPages})`);

  function canonicalHtml(body, pathname) {
    const canonical = [...body.matchAll(/<link\b[^>]*>/gi)].filter(m => /\brel=["']canonical["']/i.test(m[0])).map(m => m[0].match(/\bhref=["']([^"']+)["']/i)?.[1]);
    assert.deepEqual(canonical, [canonicalOrigin + pathname], `${pathname}: canonical URL`);
  }

  // Check the bug before sitemap discovery so a stale nginx image fails clearly.
  for (const pathname of skills) {
    const link = `<${pathname}/SKILL.md>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"`;
    for (const query of ["", QUERY]) {
      for (const method of ["GET", "HEAD"]) {
        const response = await ok(pathname + query, method, /^text\/html\b/i);
        security(response, pathname);
        if (method === "GET") canonicalHtml(response.body, pathname);
        assert.equal(response.headers.get("link"), link, `${method} ${pathname + query}: Markdown alternate`);
        const target = response.headers.get("link").match(/^<([^>]+)>/)[1];
        await ok(target, method, /^text\/markdown\s*;\s*charset=utf-8$/i);
        const upper = pathname.replace(/[^/]+$/, slug => slug.toUpperCase());
        for (const variant of [`${pathname}/`, `${pathname}/index.html`, upper, `${upper}/`, `${upper}/index.html`]) {
          const final = await redirect(variant + query, pathname + query, method);
          assert.equal(final.headers.get("link"), link, `${variant}: final Markdown alternate`);
        }
      }
    }
  }

  for (const query of ["", QUERY]) {
    for (const method of ["GET", "HEAD"]) await redirect(`/sitemap.xml${query}`, `/sitemap-index.xml${query}`, method, true);
  }
  const robots = await ok("/robots.txt", "GET", /^text\/plain\b/i);
  await ok("/robots.txt", "HEAD", /^text\/plain\b/i);
  const declarations = [...robots.body.matchAll(/^\s*sitemap\s*:\s*(\S+)\s*$/gim)].map(m => m[1]);
  assert(declarations.length, "robots.txt has no Sitemap declaration");
  const roots = declarations.map(publishedPath);
  assert(roots.includes("/sitemap-index.xml"), "robots.txt must advertise /sitemap-index.xml");
  for (const page of expected) {
    for (const bot of SEARCH_BOTS) assert(robotsAllows(robots.body, bot, page), `${bot} blocked for ${page}`);
    if (profile === "production-edge") {
      for (const bot of TRAINING_BOTS) assert(!robotsAllows(robots.body, bot, page), `${bot}: training exclusion missing for ${page}`);
    }
  }

  const visited = new Set();
  const inventory = new Set();
  async function sitemap(pathname) {
    assert(!visited.has(pathname), `Duplicate or cyclic sitemap: ${pathname}`);
    visited.add(pathname);
    assert(visited.size <= maxSitemaps, `Sitemap budget exceeded (${maxSitemaps})`);
    const response = await ok(pathname, "GET", /^(?:application|text)\/xml\b/i);
    await ok(pathname, "HEAD", /^(?:application|text)\/xml\b/i);
    const locations = xmlLocations(response.body);
    assert(locations.length, `Empty sitemap: ${pathname}`);
    // Validate all hosts before issuing any requests from this document.
    const paths = locations.map(publishedPath);
    if (/<sitemapindex\b/.test(response.body)) {
      for (const child of paths) await sitemap(child);
    } else {
      assert(/<urlset\b/.test(response.body), `Invalid sitemap root: ${pathname}`);
      for (const page of paths) {
        assert(!inventory.has(page), `Duplicate sitemap page: ${page}`);
        inventory.add(page);
        assert(inventory.size <= maxPages, `Page budget exceeded (${maxPages})`);
      }
    }
  }
  for (const root of new Set(roots)) await sitemap(root);
  assert.deepEqual([...inventory].sort(), [...expected].sort(), "Sitemap inventory differs from catalog + supporting pages");
  for (const page of inventory) {
    const response = await ok(page, "GET", /^text\/html\b/i);
    await ok(page, "HEAD", /^text\/html\b/i);
    canonicalHtml(response.body, page);
    assert(!/\b(?:noindex|none)\b/i.test(response.headers.get("x-robots-tag") ?? ""), `${page}: HTTP indexing block`);
  }
  let missingSkill = "/skill/seo-http-missing-skill";
  while (expected.has(missingSkill)) missingSkill += "-x";
  for (const pathname of ["/__seo-http-missing-page__", missingSkill, `${skills[0]}/__seo-http-missing-file__.md`]) {
    for (const method of ["GET", "HEAD"]) {
      const response = await request(pathname + QUERY, method);
      assert.equal(response.status, 404, `${method} ${pathname}: true 404 required`);
      assert(!response.headers.has("location"), `${pathname}: 404 must not redirect`);
      assert(!response.headers.has("link"), `${pathname}: 404 must not advertise an alternate`);
      security(response, pathname);
      if (method === "GET") assert.match(response.body, /not found/i, `${pathname}: branded 404`);
    }
  }
  return { profile, skills: skills.length, pages: inventory.size, sitemaps: visited.size, requests };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = {};
    const keys = { "--origin": "origin", "--canonical-origin": "canonicalOrigin", "--profile": "profile" };
    for (let i = 2; i < process.argv.length; i += 2) {
      const key = keys[process.argv[i]];
      assert(key && process.argv[i + 1], "Usage: node scripts/check-seo-http.mjs [--origin URL] [--canonical-origin URL] [--profile origin|production-edge]");
      options[key] = process.argv[i + 1];
    }
    console.log("SEO HTTP OK", await checkSeoHttp(options));
  } catch (error) {
    console.error(`SEO HTTP FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}
