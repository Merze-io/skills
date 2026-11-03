#!/usr/bin/env node
/**
 * Render the committed social preview cards for skills.merze.ai.
 *
 * Manual, offline job. It is not part of `npm run build`, CI, or any runtime
 * path: the PNGs in site/public/social/ are committed, and this script only
 * regenerates them when a template changes.
 *
 * Usage (from `site/`):
 *   node scripts/generate-social-images.mjs            # all cards
 *   node scripts/generate-social-images.mjs us-llc-state-cost-v1   # one card
 *
 * Options:
 *   --out-dir <dir>   output directory (default: public/social)
 *   --check           render, verify, and compare bytes; write nothing
 *
 * Requires puppeteer (devDependency) and a local Chrome. Set
 * PUPPETEER_EXECUTABLE_PATH to override the browser binary.
 *
 * No network: every request that is not file:// or data: aborts the render.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(SCRIPT_DIR, "..");
const TEMPLATE_DIR = path.join(SITE_DIR, "assets", "social");

const CANVAS = { width: 1200, height: 630 };
const SAFE_INSET = 64;

/** @type {{ name: string, template: string, description: string }[]} */
const CARDS = [
  {
    name: "merze-skills-v1",
    template: "merze-skills-v1.html",
    description: "Catalog card: Merze Skills",
  },
  {
    name: "us-llc-state-cost-v1",
    template: "us-llc-state-cost-v1.html",
    description: "Skill card: US LLC Incorporation State Comparison",
  },
];

function parseArgs(argv) {
  const options = { names: [], outDir: path.join(SITE_DIR, "public", "social"), check: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out-dir") {
      const value = argv[i + 1];
      if (!value) throw new Error("--out-dir needs a directory");
      options.outDir = path.resolve(process.cwd(), value);
      i += 1;
    } else if (arg === "--check") {
      options.check = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      options.names.push(arg.replace(/\.html$/, ""));
    }
  }
  return options;
}

async function loadPuppeteer() {
  try {
    const mod = await import("puppeteer");
    return mod.default ?? mod;
  } catch {
    throw new Error(
      "puppeteer is not installed. Run `npm ci` in site/ (puppeteer is a devDependency).",
    );
  }
}

/**
 * A cached Chrome download can be half-extracted (binary present, framework
 * missing), and such a binary fails to launch. Check the pieces we depend on.
 */
function isUsableChrome(binary) {
  if (!binary || !existsSync(binary)) return false;
  const appSuffix = ".app/Contents/MacOS/";
  const index = binary.indexOf(appSuffix);
  if (index === -1) return true;
  return existsSync(`${binary.slice(0, index)}.app/Contents/Frameworks`);
}

function cachedChromeBinaries() {
  const root = path.join(os.homedir(), ".cache", "puppeteer", "chrome");
  if (!existsSync(root)) return [];
  const versionKey = (entry) =>
    entry
      .split(".")
      .slice(0, 3)
      .reduce((sum, part) => sum * 1000 + (Number.parseInt(part, 10) || 0), 0);
  return readdirSync(root)
    .sort((a, b) => versionKey(b) - versionKey(a))
    .flatMap((version) => [
      path.join(
        root,
        version,
        "chrome-mac-arm64",
        "Google Chrome for Testing.app",
        "Contents",
        "MacOS",
        "Google Chrome for Testing",
      ),
      path.join(
        root,
        version,
        "chrome-mac-x64",
        "Google Chrome for Testing.app",
        "Contents",
        "MacOS",
        "Google Chrome for Testing",
      ),
      path.join(root, version, "chrome-linux64", "chrome"),
    ]);
}

/**
 * The browser binary: PUPPETEER_EXECUTABLE_PATH, then Puppeteer's own choice,
 * then the newest complete download in the Puppeteer cache, then system Chrome.
 */
function resolveExecutable(puppeteer) {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (fromEnv) {
    if (!isUsableChrome(fromEnv)) {
      throw new Error(
        `PUPPETEER_EXECUTABLE_PATH is not a usable Chrome binary: ${fromEnv}`,
      );
    }
    return fromEnv;
  }

  const candidates = [];
  try {
    candidates.push(puppeteer.executablePath());
  } catch {
    // No browser downloaded for this Puppeteer version; use the fallbacks.
  }
  candidates.push(
    ...cachedChromeBinaries(),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  );

  for (const candidate of candidates) {
    if (isUsableChrome(candidate)) return candidate;
  }
  throw new Error(
    "No usable Chrome binary found. Set PUPPETEER_EXECUTABLE_PATH, or run `npx puppeteer browsers install chrome`.",
  );
}

function readPngSize(file) {
  const buffer = readFileSync(file);
  const signature = buffer.subarray(1, 4).toString("ascii");
  if (signature !== "PNG") throw new Error(`Not a PNG: ${file}`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/**
 * Checks that run inside the page before the screenshot: fonts loaded, text
 * inside the 64px safe inset, and nothing spilling off the 1200x630 canvas.
 */
async function checkLayout(page, name) {
  return page.evaluate(
    ({ inset, canvas }) => {
      const problems = [];
      const epsilon = 0.5;
      const minX = inset - epsilon;
      const minY = inset - epsilon;
      const maxX = canvas.width - inset + epsilon;
      const maxY = canvas.height - inset + epsilon;

      if (!document.fonts.check('800 100px "Rethink Sans"')) {
        problems.push("Rethink Sans did not load");
      }
      if (document.fonts.status !== "loaded") {
        problems.push(`font status is ${document.fonts.status}`);
      }

      for (const element of document.querySelectorAll("[data-safe]")) {
        const rect = element.getBoundingClientRect();
        const label = (element.textContent ?? "").trim().slice(0, 40) || element.className;
        if (rect.left < minX || rect.top < minY || rect.right > maxX || rect.bottom > maxY) {
          problems.push(
            `outside ${inset}px inset: "${label}" [${Math.round(rect.left)}, ${Math.round(rect.top)}, ${Math.round(rect.right)}, ${Math.round(rect.bottom)}]`,
          );
        }
      }

      const body = document.body;
      if (body.scrollWidth > canvas.width || body.scrollHeight > canvas.height) {
        problems.push(
          `content overflows canvas: ${body.scrollWidth}x${body.scrollHeight}`,
        );
      }

      return problems;
    },
    { inset: SAFE_INSET, canvas: CANVAS },
  ).catch((error) => {
    throw new Error(`Layout check failed for ${name}: ${error.message}`);
  });
}

async function renderCard(browser, card, options) {
  const templatePath = path.join(TEMPLATE_DIR, card.template);
  if (!existsSync(templatePath)) {
    throw new Error(`Missing template: ${templatePath}`);
  }

  const page = await browser.newPage();
  const externalRequests = [];
  try {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith("file://") || url.startsWith("data:")) {
        request.continue();
        return;
      }
      externalRequests.push(url);
      request.abort();
    });
    page.on("pageerror", (error) => {
      externalRequests.push(`pageerror: ${error.message}`);
    });

    await page.setViewport({
      width: CANVAS.width,
      height: CANVAS.height,
      deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(templatePath).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const problems = await checkLayout(page, card.name);
    if (externalRequests.length > 0) {
      problems.push(`network or script activity: ${externalRequests.join(", ")}`);
    }
    if (problems.length > 0) {
      throw new Error(`${card.name}: ${problems.join("; ")}`);
    }

    const png = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: CANVAS.width, height: CANVAS.height },
      captureBeyondViewport: false,
    });

    const outputPath = path.join(options.outDir, `${card.name}.png`);
    if (options.check) {
      if (!existsSync(outputPath)) {
        throw new Error(`${card.name}: committed PNG is missing at ${outputPath}`);
      }
      const current = readFileSync(outputPath);
      if (!current.equals(png)) {
        throw new Error(`${card.name}: committed PNG is stale; regenerate it`);
      }
      return { name: card.name, outputPath, bytes: current.length, changed: false };
    }

    mkdirSync(options.outDir, { recursive: true });
    writeFileSync(outputPath, png);
    const size = readPngSize(outputPath);
    if (size.width !== CANVAS.width || size.height !== CANVAS.height) {
      throw new Error(
        `${card.name}: expected ${CANVAS.width}x${CANVAS.height}, got ${size.width}x${size.height}`,
      );
    }
    return { name: card.name, outputPath, bytes: png.length, changed: true };
  } finally {
    await page.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const selected = options.names.length
    ? CARDS.filter((card) => options.names.includes(card.name))
    : CARDS;

  if (selected.length === 0) {
    throw new Error(
      `No matching card. Known: ${CARDS.map((card) => card.name).join(", ")}`,
    );
  }

  const puppeteer = await loadPuppeteer();
  const executablePath = resolveExecutable(puppeteer);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--allow-file-access-from-files", "--disable-lcd-text", "--font-render-hinting=none"],
  });

  let failed = false;
  try {
    for (const card of selected) {
      try {
        const result = await renderCard(browser, card, options);
        const size = readPngSize(result.outputPath);
        const kb = (result.bytes / 1024).toFixed(1);
        console.log(
          `${options.check ? "verified" : "wrote"} ${path.relative(SITE_DIR, result.outputPath)} — ${size.width}x${size.height}, ${kb} KB`,
        );
      } catch (error) {
        failed = true;
        console.error(`FAILED ${card.name}: ${error.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
