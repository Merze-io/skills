import assert from "node:assert/strict";
import test from "node:test";

import {
  batchUrls,
  collectPurgeUrls,
  MAX_URLS_PER_REQUEST,
  normalizeBaseUrl,
  sitemapLocations,
} from "../scripts/purge-edge-cache.mjs";

const BASE = "https://skills.merze.ai";
const sitemap = (...locs) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset>${locs
    .map((loc) => `<url><loc>${loc}</loc></url>`)
    .join("")}</urlset>`;

test("normalizeBaseUrl keeps the origin and rejects paths", () => {
  assert.equal(normalizeBaseUrl("https://skills.merze.ai"), BASE);
  assert.equal(normalizeBaseUrl("https://skills.merze.ai/"), BASE);
  assert.throws(() => normalizeBaseUrl("https://skills.merze.ai/about"));
  assert.throws(() => normalizeBaseUrl("ftp://skills.merze.ai"));
});

test("sitemapLocations reads locs and rejects DTDs", () => {
  const xml = sitemap(`${BASE}/`, `${BASE}/about`);
  assert.deepEqual(sitemapLocations(xml), [`${BASE}/`, `${BASE}/about`]);
  assert.throws(() => sitemapLocations(`<!DOCTYPE x>${xml}`));
});

test("collectPurgeUrls adds every sitemap page and discovery endpoint", () => {
  const urls = collectPurgeUrls({
    sitemapXml: sitemap(`${BASE}/`, `${BASE}/about`),
    baseUrl: BASE,
  });
  assert.ok(urls.includes(`${BASE}/`));
  assert.ok(urls.includes(`${BASE}/about`));
  assert.ok(urls.includes(`${BASE}/robots.txt`));
  assert.ok(urls.includes(`${BASE}/skills.json`));
  assert.ok(urls.includes(`${BASE}/.well-known/agent-skills/index.json`));
  assert.equal(new Set(urls).size, urls.length, "no duplicates");
});

test("collectPurgeUrls never purges another host", () => {
  assert.throws(
    () =>
      collectPurgeUrls({
        sitemapXml: sitemap("https://www.merze.ai/about"),
        baseUrl: BASE,
      }),
    /off-origin/,
  );
  assert.throws(
    () =>
      collectPurgeUrls({
        sitemapXml: sitemap(`${BASE}/about?x=1`),
        baseUrl: BASE,
      }),
    /must be clean/,
  );
});

test("batchUrls covers every URL in Cloudflare-sized chunks", () => {
  const urls = Array.from({ length: 71 }, (_, i) => `${BASE}/page-${i}`);
  const batches = batchUrls(urls);
  assert.equal(batches[0].length, MAX_URLS_PER_REQUEST);
  assert.deepEqual(batches.flat(), urls);
  assert.throws(() => batchUrls(urls, 0));
});
