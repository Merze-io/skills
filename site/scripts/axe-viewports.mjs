#!/usr/bin/env node
/**
 * Run axe-core against key pages at real Chromium viewports via Puppeteer
 * setViewport (not CLI window-size). Asserts innerWidth and no horizontal
 * overflow; can fail both checks (see --self-test).
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { AxePuppeteer } from "@axe-core/puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "..", "dist");
const PORT = Number(process.env.AXE_PORT || 4173);
const SELF_TEST = process.argv.includes("--self-test");

const VIEWPORTS = [
  { width: 320, height: 720, name: "320" },
  { width: 360, height: 800, name: "360" },
  { width: 1280, height: 900, name: "1280" },
];
const PAGES = [
  "/",
  "/skill/us-llc-state-cost",
  "/skill/us-llc-state-cost/states",
  "/install",
  "/about",
  "/404.html",
  "/no-such-page",
];

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

async function checkViewportOverflow(page, vp, route) {
  const [iw, sw] = await page.evaluate(() => [
    window.innerWidth,
    document.documentElement.scrollWidth,
  ]);
  if (iw !== vp.width || sw > iw + 1) {
    console.error(
      `Viewport/overflow for ${route}: innerWidth ${iw}, scrollWidth ${sw}, expected ${vp.width}`,
    );
    return false;
  }
  return true;
}

async function runSelfTest(browser) {
  const fixtureDir = path.join(dist, "_axe-overflow-fixture");
  mkdirSync(fixtureDir, { recursive: true });
  const fixtureFile = path.join(fixtureDir, "index.html");
  writeFileSync(
    fixtureFile,
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>overflow</title>
<style>body{margin:0}.wide{width:2000px;height:40px;background:#112e51}</style>
</head><body><div class="wide">wide</div></body></html>`,
  );

  const page = await browser.newPage();
  await page.setViewport({ width: 320, height: 720, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${PORT}/_axe-overflow-fixture/`, {
    waitUntil: "networkidle0",
  });
  const ok = await checkViewportOverflow(page, { width: 320 }, "/_axe-overflow-fixture/");
  await page.close();
  rmSync(fixtureDir, { recursive: true, force: true });

  if (ok) {
    console.error("Self-test expected overflow failure but check passed");
    return false;
  }
  console.log("Self-test OK: overflow check failed as expected");
  return true;
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

  if (SELF_TEST) {
    const passed = await runSelfTest(browser);
    await browser.close();
    server.close();
    process.exit(passed ? 0 : 1);
  }

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

      if (!(await checkViewportOverflow(page, vp, route))) {
        failed = true;
        continue;
      }

      // Open Pagefind and exercise empty results on the catalog
      if (route === "/" && vp.width >= 360) {
        try {
          const trigger = await page.$("[data-pagefind-trigger]");
          if (trigger) {
            await trigger.click();
            await page.waitForSelector(".pagefind-ui__search-input", {
              timeout: 5000,
            });
            await page.type(".pagefind-ui__search-input", "zzqqxx");
            await new Promise((r) => setTimeout(r, 400));
          }
        } catch (err) {
          console.warn(`Pagefind probe skipped: ${err.message}`);
        }
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
