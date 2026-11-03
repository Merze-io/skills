#!/usr/bin/env node
/**
 * Purge the Cloudflare edge cache for the pages this build publishes.
 *
 * skills.merze.ai caches HTML at the edge for 5 minutes (Cache Rule
 * http_request_cache_settings). Without a purge, a deploy can serve stale HTML
 * for up to that window. Run this after the container is live.
 *
 * Reads the built sitemap so the purge always matches what shipped — it never
 * invents URLs. Refuses to touch any host other than the published origin.
 *
 * Usage (from `site/`, after `npm run build`):
 *   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ZONE_ID=… node scripts/purge-edge-cache.mjs
 *
 * Options:
 *   --dist <dir>        build directory (default: dist)
 *   --base-url <url>    published origin (default: https://skills.merze.ai)
 *   --dry-run           print the URL list, make no request
 *   --require-credentials  fail when the token or zone id is missing
 *
 * Without credentials the script exits 0 and says it skipped, so forks and
 * preview builds do not need Cloudflare secrets. No dependencies.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(SCRIPT_DIR, "..");

/** Cloudflare accepts 30 URLs per purge request (Free and Pro plans). */
export const MAX_URLS_PER_REQUEST = 30;

/** Non-HTML discovery endpoints that no sitemap lists but crawlers fetch. */
export const EXTRA_PATHS = [
  "/robots.txt",
  "/sitemap-index.xml",
  "/sitemap-0.xml",
  "/llms.txt",
  "/llms-full.txt",
  "/skills.json",
  "/.well-known/agent-skills/index.json",
];

export function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`base URL must be http(s): ${value}`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`base URL must be a bare origin: ${value}`);
  }
  if (url.pathname !== "/") {
    throw new Error(`base URL must not carry a path: ${value}`);
  }
  return url.origin;
}

/** `<loc>` values from a sitemap document. Rejects entities and doctypes. */
export function sitemapLocations(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new Error("sitemap must not declare DOCTYPE or ENTITY");
  }
  return [...xml.matchAll(/<loc\s*>([^<]+)<\/loc>/g)].map((m) =>
    m[1]
      .trim()
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'"),
  );
}

/**
 * Purge list: every sitemap URL, plus the discovery endpoints, absolute and on
 * the published origin only. Throws on a cross-host or non-canonical URL so a
 * bad build cannot purge someone else's zone.
 */
export function collectPurgeUrls({ sitemapXml, baseUrl, extraPaths = EXTRA_PATHS }) {
  const origin = normalizeBaseUrl(baseUrl);
  const urls = new Set();

  for (const loc of sitemapLocations(sitemapXml)) {
    const url = new URL(loc);
    if (url.origin !== origin) {
      throw new Error(`sitemap URL is off-origin (${origin}): ${loc}`);
    }
    if (url.search || url.hash) {
      throw new Error(`sitemap URL must be clean: ${loc}`);
    }
    urls.add(url.href);
  }

  for (const extraPath of extraPaths) {
    if (!extraPath.startsWith("/") || extraPath.startsWith("//")) {
      throw new Error(`extra path must be root-relative: ${extraPath}`);
    }
    urls.add(new URL(extraPath, origin).href);
  }

  return [...urls].sort();
}

/** Split into batches Cloudflare accepts; keeps order and never drops a URL. */
export function batchUrls(urls, size = MAX_URLS_PER_REQUEST) {
  if (!Number.isSafeInteger(size) || size < 1) {
    throw new Error(`invalid batch size: ${size}`);
  }
  const batches = [];
  for (let i = 0; i < urls.length; i += size) {
    batches.push(urls.slice(i, i + size));
  }
  return batches;
}

function argValue(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

async function purgeBatch({ zoneId, token, files }) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files }),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success !== true) {
    const detail = (body.errors ?? [])
      .map((error) => error.message)
      .join("; ");
    throw new Error(
      `purge failed (${response.status}): ${detail || "no error detail"}`,
    );
  }
  return body;
}

async function main() {
  const argv = process.argv.slice(2);
  const dist = path.resolve(SITE_DIR, argValue(argv, "--dist") ?? "dist");
  const baseUrl = normalizeBaseUrl(
    argValue(argv, "--base-url") ?? "https://skills.merze.ai",
  );
  const dryRun = argv.includes("--dry-run");
  const requireCredentials = argv.includes("--require-credentials");

  const sitemapPath = path.join(dist, "sitemap-0.xml");
  if (!fs.existsSync(sitemapPath)) {
    throw new Error(
      `no ${path.relative(SITE_DIR, sitemapPath)} — run npm run build first`,
    );
  }

  const urls = collectPurgeUrls({
    sitemapXml: fs.readFileSync(sitemapPath, "utf8"),
    baseUrl,
  });

  if (dryRun) {
    console.log(`purge --dry-run: ${urls.length} URL(s) on ${baseUrl}`);
    for (const url of urls) console.log(`  ${url}`);
    return;
  }

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) {
    const message =
      "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID are not both set";
    if (requireCredentials) throw new Error(message);
    console.log(`purge: skipped (${message})`);
    return;
  }

  let purged = 0;
  for (const files of batchUrls(urls)) {
    await purgeBatch({ zoneId, token, files });
    purged += files.length;
  }
  console.log(`purge: ok (${purged} URL(s) on ${baseUrl})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`purge FAILED: ${error.message}`);
    process.exitCode = 1;
  });
}
