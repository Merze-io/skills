import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { checkSeoHttp, robotsAllows } from "./check-seo-http.mjs";

const canonical = "https://skills.merze.ai";
const headers = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'self'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};
const training = ["GPTBot", "ClaudeBot", "Google-Extended"].map(bot => `User-agent: ${bot}\nDisallow: /\n`).join("\n");

async function fixture(t, { count = 2, fault = "", edge = false } = {}) {
  const names = Array.from({ length: count }, (_, i) => `example-${String.fromCharCode(97 + i)}`);
  const pages = ["/", "/about", ...names.flatMap(n => [`/skill/${n}`, `/skill/${n}/guide`])];
  const requests = [];
  const server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    const url = new URL(req.url, "http://fixture.test");
    const path = url.pathname;
    const send = (status, body = "", type = "text/html", extra = {}) => {
      res.writeHead(status, { ...headers, "Content-Type": type, ...extra });
      res.end(req.method === "HEAD" ? "" : body);
    };
    if (fault === "timeout") return;
    if (path === "/skills.json") return send(200, JSON.stringify({ skills: names.map(name => ({
      name, url: `${canonical}/skill/${name}`, skill_md_url: `${canonical}/skill/${name}/SKILL.md`,
      files: [{ path: "SKILL.md" }, { path: "guide.md" }, { path: "nested/raw.md" }],
    })) }), "application/json");
    if (path === "/robots.txt") return send(200,
      `User-agent: *\nAllow: /\n\n${edge ? training : ""}\nSitemap: ${fault === "robots-host" ? "https://www.merze.ai" : canonical}/sitemap-index.xml\n`, "text/plain");
    if (path === "/sitemap.xml") return send(fault === "alias" ? 404 : 301, "", "text/html", { Location: `/sitemap-index.xml${url.search}` });
    if (path === "/sitemap-index.xml") return send(200,
      `<sitemapindex><sitemap><loc>${fault === "child-host" ? "https://www.merze.ai" : canonical}/sitemap-0.xml</loc></sitemap></sitemapindex>`, "application/xml");
    if (path === "/sitemap-0.xml") return send(200,
      fault === "cycle" ? `<sitemapindex><sitemap><loc>${canonical}/sitemap-index.xml</loc></sitemap></sitemapindex>` :
      `<urlset>${(fault === "missing-page" ? pages.slice(0, -1) : pages).map(p => `<url><loc>${fault === "page-host" ? "https://www.merze.ai" : canonical}${p}</loc></url>`).join("")}</urlset>`, "application/xml");
    const skill = names.find(n => path.toLowerCase().startsWith(`/skill/${n}`));
    const base = skill && `/skill/${skill}`;
    if (base && path === `${base}/SKILL.md`) return send(200, "# Skill", fault === "mime" ? "text/html" : "text/markdown; charset=utf-8");
    if (base && [base, `${base}/`, `${base}/index.html`].includes(path.toLowerCase()) && path !== base) {
      return send(301, "", "text/html", { Location: base + (fault === "redirect-query" ? "" : url.search) });
    }
    if (pages.includes(path)) {
      const link = base && path === base ? { Link: `<${base}${fault === "old-uri" ? "/index.html" : fault === "query-link" ? url.search : ""}/SKILL.md>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"` } : {};
      return send(fault === "head" && req.method === "HEAD" ? 405 : 200, `<html><head><link rel="canonical" href="${canonical}${path}"></head><body>Catalog</body></html>`, "text/html", link);
    }
    return send(fault === "soft-404" ? 200 : 404, "Not found");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return { origin: `http://127.0.0.1:${server.address().port}`, rawIntervalMs: 0, requests };
}

test("catalog inventory grows; GET, HEAD, queries and combined redirects are checked", async t => {
  for (const count of [1, 3]) {
    const f = await fixture(t, { count });
    const result = await checkSeoHttp(f);
    assert.equal(result.skills, count);
    assert.equal(result.pages, 2 + 2 * count);
    for (const method of ["GET", "HEAD"]) {
      assert(f.requests.includes(`${method} /skill/EXAMPLE-A/index.html?seo_probe=1&value=a%2Fb`));
      assert(f.requests.includes(`${method} /skill/example-a/SKILL.md`));
      assert(f.requests.includes(`${method} /sitemap.xml?seo_probe=1&value=a%2Fb`));
    }
  }
});

for (const [fault, message] of [
  ["old-uri", /Markdown alternate/], ["query-link", /Markdown alternate/],
  ["alias", /permanent redirect/], ["mime", /MIME/], ["head", /expected 200/],
  ["redirect-query", /exact relative Location/], ["soft-404", /true 404/],
  ["robots-host", /Cross-host inventory/], ["child-host", /Cross-host inventory/],
  ["page-host", /Cross-host inventory/], ["cycle", /cyclic sitemap/],
  ["missing-page", /Sitemap inventory differs/],
]) {
  test(`rejects ${fault}`, async t => {
    await assert.rejects(checkSeoHttp(await fixture(t, { fault })), message);
  });
}

test("origin does not demand training exclusions; edge profile does", async t => {
  const origin = await fixture(t);
  await checkSeoHttp(origin);
  await assert.rejects(checkSeoHttp({ ...origin, profile: "production-edge" }), /training exclusion missing/);
  const edge = await fixture(t, { edge: true });
  await checkSeoHttp({ ...edge, profile: "production-edge" });
});

test("robots specificity keeps search and training separate", () => {
  const body = `User-agent: *\nDisallow: /\n\nUser-agent: Googlebot\nAllow: /\nDisallow: /private*\nAllow: /private/public$\n\n${training}`;
  assert(robotsAllows(body, "Googlebot", "/"));
  assert(!robotsAllows(body, "Googlebot", "/private/a"));
  assert(robotsAllows(body, "Googlebot", "/private/public"));
  assert(!robotsAllows(body, "GPTBot", "/"));
  assert(!robotsAllows(body, "OAI-SearchBot", "/"));
});

test("request, byte, page, sitemap and timeout bounds fail closed", async t => {
  const f = await fixture(t);
  await assert.rejects(checkSeoHttp({ ...f, maxRequests: 1 }), /Request budget/);
  await assert.rejects(checkSeoHttp({ ...f, maxBytes: 10 }), /response exceeds/);
  await assert.rejects(checkSeoHttp({ ...f, maxPages: 1 }), /Page budget/);
  await assert.rejects(checkSeoHttp({ ...f, maxSitemaps: 1 }), /Sitemap budget/);
  await assert.rejects(checkSeoHttp({ ...await fixture(t, { fault: "timeout" }), timeoutMs: 30 }), /aborted/i);
});
