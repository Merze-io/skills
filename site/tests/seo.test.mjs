import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSiteGraph,
  buildCollectionPage,
  buildAboutPage,
  buildSkillPage,
  buildSupportingPage,
  serializeJsonLd,
  validatePageSeo,
  resolveSupportingMetadata,
  socialImageForSkill,
} from "../src/lib/seo.mjs";

const siteUrl = "https://skills.merze.ai/";
const skillUrl = `${siteUrl}skill/us-llc-state-cost`;
const docUrl = `${skillUrl}/states`;
const base = { siteUrl, url: skillUrl, name: "US LLC Incorporation State Comparison", description: "Compare domestic LLC state costs." };
const crumbs = [{ name: "Catalog", url: siteUrl }, { name: base.name, url: skillUrl }];
const nodeOf = (nodes, type) => nodes.find((node) => node["@type"] === type);

test("site identities have stable IDs and truthful publisher relationships", () => {
  const graph = buildSiteGraph({ siteUrl, nodes: [] });
  assert.equal(graph["@context"], "https://schema.org");
  const site = nodeOf(graph["@graph"], "WebSite");
  const org = nodeOf(graph["@graph"], "Organization");
  assert.equal(site["@id"], `${siteUrl}#website`);
  assert.equal(org["@id"], "https://merze.ai/#organization");
  assert.equal(org.url, "https://merze.ai");
  assert.equal(org.name, "Merze");
  assert.deepEqual(site.publisher, { "@id": org["@id"] });
});

test("catalog uses only supplied real items, in order, including an empty catalog", () => {
  const skills = [{ name: base.name, url: skillUrl }, { name: "Another existing skill", url: `${siteUrl}skill/second` }];
  const nodes = buildCollectionPage({ ...base, url: siteUrl, skills });
  const list = nodeOf(nodes, "ItemList");
  assert.equal(list.numberOfItems, 2);
  assert.deepEqual(list.itemListElement, skills.map((skill, i) => ({ "@type": "ListItem", position: i + 1, name: skill.name, url: skill.url })));
  assert.deepEqual(nodeOf(nodes, "CollectionPage").mainEntity, { "@id": list["@id"] });
  assert.equal(nodeOf(buildCollectionPage({ ...base, skills: [] }), "ItemList").numberOfItems, 0);
});

test("about describes Merze and reflects the supplied visible navigation", () => {
  const breadcrumbs = [crumbs[0], { name: "About", url: `${siteUrl}about` }];
  const nodes = buildAboutPage({ ...base, url: `${siteUrl}about`, breadcrumbs });
  assert.deepEqual(nodeOf(nodes, "AboutPage").about, { "@id": "https://merze.ai/#organization" });
  const list = nodeOf(nodes, "BreadcrumbList");
  assert.deepEqual(list.itemListElement.map(({ name, item, position }) => ({ name, url: item, position })), breadcrumbs.map((crumb, i) => ({ ...crumb, position: i + 1 })));
});

test("skill is a WebPage with a CreativeWork and the caller's genuine date/version", () => {
  const updatedAt = "2026-10-22T00:00:00.000Z";
  const nodes = buildSkillPage({ ...base, version: "1.2.0", updatedAt, breadcrumbs: crumbs });
  const work = nodeOf(nodes, "CreativeWork");
  const page = nodeOf(nodes, "WebPage");
  assert.equal(work.url, skillUrl);
  assert.equal(work.inLanguage, "en");
  assert.equal(work.version, "1.2.0");
  assert.equal(work.dateModified, updatedAt);
  assert.equal(page.dateModified, updatedAt);
  assert.deepEqual(page.mainEntity, { "@id": work["@id"] });
  assert.deepEqual(work.mainEntityOfPage, { "@id": page["@id"] });
  assert.deepEqual(page.breadcrumb, { "@id": `${skillUrl}#breadcrumb` });
  assert.deepEqual(page.isPartOf, { "@id": `${siteUrl}#website` });
});

test("unknown dates and versions are omitted, never replaced with build time", () => {
  for (const updatedAt of [undefined, null, "", "not-a-date"]) {
    const nodes = buildSkillPage({ ...base, updatedAt });
    for (const node of nodes) {
      assert.equal(Object.hasOwn(node, "dateModified"), false);
      assert.equal(Object.hasOwn(node, "version"), false);
    }
  }
});

test("supporting work links to its parent without inheriting package dates/version", () => {
  const nodes = buildSupportingPage({ ...base, url: docUrl, parentUrl: skillUrl, updatedAt: "2026-10-22T00:00:00.000Z", version: "1.2.0", breadcrumbs: [...crumbs, { name: "State fees", url: docUrl }] });
  const work = nodeOf(nodes, "CreativeWork");
  assert.deepEqual(work.isPartOf, { "@id": `${skillUrl}#creativework` });
  assert.equal(work.url, docUrl);
  for (const node of nodes) {
    assert.equal(Object.hasOwn(node, "dateModified"), false);
    assert.equal(Object.hasOwn(node, "datePublished"), false);
    assert.equal(Object.hasOwn(node, "version"), false);
  }
});

test("graphs do not invent commercial, review, author, or license facts", () => {
  const nodes = buildSkillPage({ ...base, author: "Invented", offers: { price: 0 }, rating: 5 });
  const serialized = JSON.stringify(buildSiteGraph({ siteUrl, nodes }));
  for (const key of ["author", "offers", "aggregateRating", "review", "license", "datePublished"]) assert.equal(serialized.includes(`\"${key}\"`), false);
  assert.equal(serialized.includes("SoftwareApplication"), false);
  assert.equal(serialized.includes("Product"), false);
});

test("JSON-LD escapes script terminators while retaining exact JSON values", () => {
  const input = { text: '</script><script>alert("x")</script><!--', unicode: "Costs & café" };
  const encoded = serializeJsonLd(input);
  assert.equal(encoded.includes("<"), false);
  assert.ok(encoded.includes("\\u003c/script>"));
  assert.deepEqual(JSON.parse(encoded), input);
});

test("presentation overrides accept only nonempty plain title/description strings", () => {
  assert.deepEqual(validatePageSeo({ "/about": { title: " About ", description: " What skills are. " } }), { "/about": { title: "About", description: "What skills are." } });
  for (const value of [[], null, { bad: {} }, { "/about": null }, { "/about": { title: " " } }, { "/about": { title: 12 } }, { "/about": { title: "<b>About</b>" } }, { "/about": { dateModified: "2026-10-22" } }]) assert.throws(() => validatePageSeo(value));
});

test("supporting title prefers validated override, then Markdown heading, then filename", () => {
  const input = { filename: "states.md", skillTitle: base.name, body: "# State LLC fee table\n\nBody" };
  assert.equal(resolveSupportingMetadata({ ...input, override: { title: "U.S. LLC formation fees and annual state costs", description: "Formation and recurring costs." } }).title, "U.S. LLC formation fees and annual state costs");
  assert.equal(resolveSupportingMetadata(input).title, "State LLC fee table");
  assert.equal(resolveSupportingMetadata({ ...input, body: "No heading" }).title, "states.md");
  assert.equal(resolveSupportingMetadata({ ...input, body: "```md\n# Not a title\n```\n\n## **Real** [fees](https://example.com) ##" }).title, "Real fees");
  assert.equal(resolveSupportingMetadata({ ...input, body: "State fees\n==========\n\nBody" }).title, "State fees");
  assert.throws(() => resolveSupportingMetadata({ ...input, override: { title: 5 } }));
});

test("social images use the skill card only for its actual skill", () => {
  assert.equal(socialImageForSkill("us-llc-state-cost").socialImage, "/social/us-llc-state-cost-v1.png");
  for (const slug of [undefined, "future-skill", "us-llc-state-cost-copy"]) {
    assert.equal(socialImageForSkill(slug).socialImage, "/social/merze-skills-v1.png");
    assert.ok(socialImageForSkill(slug).socialImageAlt.length > 0);
  }
});
