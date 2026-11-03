#!/usr/bin/env node
/**
 * Built-page SEO assertions (fail closed). Runs after `npm run build` against
 * dist/ HTML only — no browser, no network, no dependencies.
 *
 * Checks each public page for:
 *   - exactly one <h1>
 *   - self-referencing absolute canonical on the canonical host
 *   - og:url agreeing with canonical, og:image at 1200x630, twitter large card
 *   - a JSON-LD @graph with the expected node types
 *   - JSON-LD that cannot break out of its script element
 *
 * Usage: node scripts/check-seo-pages.mjs [--dist dist]
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(SCRIPT_DIR, "..");
const CANONICAL_ORIGIN = "https://skills.merze.ai";

const distArg = process.argv.indexOf("--dist");
const DIST = path.resolve(
  SITE_DIR,
  distArg === -1 ? "dist" : (process.argv[distArg + 1] ?? "dist"),
);

/** Every public page and the schema types its @graph must contain. */
const PAGES = [
  {
    path: "/",
    file: "index.html",
    types: ["Organization", "WebSite", "CollectionPage", "ItemList"],
  },
  {
    path: "/about",
    file: "about/index.html",
    types: ["Organization", "WebSite", "AboutPage", "BreadcrumbList"],
  },
  {
    path: "/skill/us-llc-state-cost",
    file: "skill/us-llc-state-cost/index.html",
    types: ["Organization", "WebSite", "WebPage", "CreativeWork", "BreadcrumbList"],
  },
  {
    path: "/skill/us-llc-state-cost/states",
    file: "skill/us-llc-state-cost/states/index.html",
    types: ["Organization", "WebSite", "WebPage", "CreativeWork", "BreadcrumbList"],
  },
];

/** Read an attribute from the opening tags of `name` (meta/link). */
function attributes(html, tag) {
  const found = [];
  for (const match of html.matchAll(new RegExp(`<${tag}\\s([^>]*)>`, "gi"))) {
    const attrs = {};
    for (const attr of match[1].matchAll(/([a-z:-]+)="([^"]*)"/gi)) {
      attrs[attr[1].toLowerCase()] = attr[2];
    }
    found.push(attrs);
  }
  return found;
}

function metaContent(pairs, key, value) {
  const hit = pairs.find((attrs) => attrs[key] === value);
  return hit ? hit.content : undefined;
}

function jsonLdGraphs(html) {
  const graphs = [];
  for (const match of html.matchAll(
    /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const raw = match[1];
    assert(
      !raw.includes("<"),
      "JSON-LD contains a literal '<' (must be escaped as \\u003c)",
    );
    graphs.push(JSON.parse(raw));
  }
  return graphs;
}

let failures = 0;
function check(label, fn) {
  try {
    fn();
    console.log(`  ok   ${label}`);
  } catch (error) {
    failures += 1;
    console.error(`  FAIL ${label}: ${error.message}`);
  }
}

for (const page of PAGES) {
  const file = path.join(DIST, page.file);
  if (!fs.existsSync(file)) {
    failures += 1;
    console.error(`  FAIL ${page.path}: missing ${path.relative(SITE_DIR, file)}`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  const canonical = `${CANONICAL_ORIGIN}${page.path}`;
  const metas = attributes(html, "meta");
  const ogImage = metaContent(metas, "property", "og:image");

  console.log(page.path);

  check("exactly one h1", () => {
    const count = (html.match(/<h1\b/gi) ?? []).length;
    assert.equal(count, 1, `expected 1 h1, found ${count}`);
  });

  check("canonical is self-referencing and absolute", () => {
    const link = attributes(html, "link").find(
      (attrs) => attrs.rel === "canonical",
    );
    assert(link, "no canonical link");
    assert.equal(link.href, canonical);
  });

  check("og:url agrees with canonical", () => {
    assert.equal(metaContent(metas, "property", "og:url"), canonical);
  });

  check("social image is 1200x630 and on the canonical host", () => {
    assert(ogImage, "no og:image");
    assert(ogImage.startsWith(`${CANONICAL_ORIGIN}/`), `off-host og:image: ${ogImage}`);
    assert.equal(metaContent(metas, "property", "og:image:width"), "1200");
    assert.equal(metaContent(metas, "property", "og:image:height"), "630");
    assert(metaContent(metas, "property", "og:image:alt"), "og:image:alt is empty");
    const assetPath = ogImage.slice(CANONICAL_ORIGIN.length).split("?")[0];
    const asset = path.join(DIST, assetPath);
    assert(fs.existsSync(asset), `og:image asset is not published: ${assetPath}`);
    const buffer = fs.readFileSync(asset);
    assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG", "og:image is not a PNG");
    assert.equal(buffer.readUInt32BE(16), 1200, "og:image width");
    assert.equal(buffer.readUInt32BE(20), 630, "og:image height");
  });

  check("twitter card is summary_large_image with an image", () => {
    assert.equal(metaContent(metas, "name", "twitter:card"), "summary_large_image");
    assert.equal(metaContent(metas, "name", "twitter:image"), ogImage);
  });

  check("JSON-LD graph carries the expected node types", () => {
    const graphs = jsonLdGraphs(html);
    assert.equal(graphs.length, 1, `expected 1 JSON-LD block, found ${graphs.length}`);
    const graph = graphs[0];
    assert.equal(graph["@context"], "https://schema.org");
    assert(Array.isArray(graph["@graph"]), "@graph is missing");
    const types = graph["@graph"].map((node) => node["@type"]);
    for (const type of page.types) {
      assert(types.includes(type), `missing @type ${type} (got ${types.join(", ")})`);
    }
    const ids = graph["@graph"].map((node) => node["@id"]).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, "duplicate @id values");
  });
}

if (failures > 0) {
  console.error(`\ncheck-seo-pages: ${failures} failure(s)`);
  process.exit(1);
}
console.log(`\ncheck-seo-pages: OK (${PAGES.length} pages)`);
