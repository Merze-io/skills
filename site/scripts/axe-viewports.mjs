#!/usr/bin/env node
/**
 * Run axe-core against key pages at real Chromium viewports.
 * @axe-core/cli's --chrome-options="window-size=360,800" is unreliable
 * (comma splitting + Chrome minimum width ~500), so we drive Puppeteer
 * with setViewport instead.
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { AxePuppeteer } from "@axe-core/puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "..", "dist");
const PORT = Number(process.env.AXE_PORT || 4173);
const VIEWPORTS = [
  { width: 320, height: 720, name: "320" },
  { width: 360, height: 800, name: "360" },
  { width: 1280, height: 900, name: "1280" },
];
const PAGES = ["/", "/us-llc-state-cost/", "/us-llc-state-cost/states/", "/about/", "/404.html"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  let rel = clean.replace(/^\/+/, "");
  if (!rel || rel.endsWith("/")) rel = path.join(rel, "index.html");
  const candidate = path.join(dist, rel);
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  const asHtml = path.join(dist, `${rel}.html`);
  if (existsSync(asHtml) && statSync(asHtml).isFile()) return asHtml;
  const asIndex = path.join(dist, rel, "index.html");
  if (existsSync(asIndex) && statSync(asIndex).isFile()) return asIndex;
  return null;
}

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const file = resolveFile(req.url || "/");
      if (!file) {
        const fallback = path.join(dist, "404.html");
        if (existsSync(fallback)) {
          res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
          res.end(readFileSync(fallback));
          return;
        }
        res.writeHead(404).end("not found");
        return;
      }
      const ext = path.extname(file);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(readFileSync(file));
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  if (!existsSync(path.join(dist, "index.html"))) {
    console.error("dist/ missing — run npm run build first");
    process.exit(1);
  }

  const server = await startServer();
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  let failed = false;
  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
    });
    console.log(`\n=== viewport ${vp.name} (${vp.width}x${vp.height}) ===`);

    for (const route of PAGES) {
      const url = `http://127.0.0.1:${PORT}${route}`;
      await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
      // Confirm viewport stuck (Chrome won't silently upscale via setViewport)
      const metrics = await page.viewport();
      if (!metrics || metrics.width !== vp.width) {
        console.error(
          `Viewport mismatch for ${route}: expected ${vp.width}, got ${metrics?.width}`,
        );
        failed = true;
        continue;
      }
      const results = await new AxePuppeteer(page).analyze();
      const violations = results.violations ?? [];
      if (violations.length === 0) {
        console.log(`OK  ${route}`);
      } else {
        failed = true;
        console.error(`FAIL ${route} — ${violations.length} violation(s)`);
        for (const v of violations) {
          console.error(`  - ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
        }
      }
    }
  }

  await browser.close();
  server.close();
  if (failed) {
    console.error("\naxe viewport checks failed");
    process.exit(1);
  }
  console.log("\nAll axe viewport checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
