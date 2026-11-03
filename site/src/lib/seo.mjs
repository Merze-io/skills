/** Pure metadata builders. Callers supply canonical URLs from the route helpers. */
const ORGANIZATION_ID = "https://merze.ai/#organization";
const ref = (id) => ({ "@id": id });
const websiteId = (siteUrl) => `${siteUrl}#website`;

export function buildSiteGraph({ siteUrl, nodes = [] }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: "Merze",
        url: "https://merze.ai",
      },
      {
        "@type": "WebSite",
        "@id": websiteId(siteUrl),
        name: "Merze Agent Skills",
        url: siteUrl,
        inLanguage: "en",
        publisher: ref(ORGANIZATION_ID),
      },
      ...nodes,
    ],
  };
}

function pageNodes({ siteUrl, url, name, description, breadcrumbs = [] }, type) {
  const page = {
    "@type": type,
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: "en",
    isPartOf: ref(websiteId(siteUrl)),
    publisher: ref(ORGANIZATION_ID),
  };
  if (!breadcrumbs.length) return [page];
  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
  return [{ ...page, breadcrumb: ref(breadcrumb["@id"]) }, breadcrumb];
}

export function buildCollectionPage({ skills, ...options }) {
  const [page, ...navigation] = pageNodes(options, "CollectionPage");
  const list = {
    "@type": "ItemList",
    "@id": `${options.url}#skills`,
    numberOfItems: skills.length,
    itemListElement: skills.map((skill, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: skill.name,
      url: skill.url,
    })),
  };
  return [{ ...page, mainEntity: ref(list["@id"]) }, list, ...navigation];
}

export function buildAboutPage(options) {
  const [page, ...navigation] = pageNodes(options, "AboutPage");
  return [{ ...page, about: ref(ORGANIZATION_ID) }, ...navigation];
}

function workNodes(options, workProperties = {}, pageProperties = {}) {
  const [page, ...navigation] = pageNodes(options, "WebPage");
  const work = {
    "@type": "CreativeWork",
    "@id": `${options.url}#creativework`,
    url: options.url,
    name: options.name,
    description: options.description,
    inLanguage: "en",
    publisher: ref(ORGANIZATION_ID),
    mainEntityOfPage: ref(page["@id"]),
    ...workProperties,
  };
  return [{ ...page, mainEntity: ref(work["@id"]), ...pageProperties }, work, ...navigation];
}

export function buildSkillPage({ version, updatedAt, ...options }) {
  // Only the committed package date is supplied by the caller. Never use build time.
  const date = typeof updatedAt === "string" && /^\d{4}-\d{2}-\d{2}T/.test(updatedAt) && !Number.isNaN(Date.parse(updatedAt))
    ? { dateModified: updatedAt }
    : {};
  const versionProperty = typeof version === "string" && version.trim()
    ? { version: version.trim() }
    : {};
  return workNodes(options, { ...versionProperty, ...date }, date);
}

export function buildSupportingPage({ parentUrl, ...options }) {
  // A package modification date/version is not a document modification date/version.
  return workNodes(options, { isPartOf: ref(`${parentUrl}#creativework`) });
}

/** Safe for raw insertion inside a script element, including hostile Markdown text. */
export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function validatePresentation(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`Invalid page SEO override: ${label}`);
  }
  const result = {};
  for (const [key, text] of Object.entries(value)) {
    if (!["title", "description"].includes(key) || typeof text !== "string" ||
        !text.trim() || /[<>\u0000-\u001f\u007f]/.test(text)) {
      throw new TypeError(`Invalid page SEO ${label}.${key}: expected plain title or description text`);
    }
    result[key] = text.trim();
  }
  return result;
}

/** Limit site-only overrides to plain presentation fields, not arbitrary schema properties. */
export function validatePageSeo(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Page SEO must be an object keyed by canonical paths");
  }
  return Object.fromEntries(Object.entries(value).map(([path, metadata]) => {
    if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(path)) {
      throw new TypeError(`Invalid page SEO canonical path: ${path}`);
    }
    return [path, validatePresentation(metadata, path)];
  }));
}

function headingText(text) {
  return text
    .replace(/!?(?:\[([^\]]+)\])\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function markdownHeading(body) {
  const lines = body.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "").split(/\r?\n/);
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const marker = lines[i].match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    const atx = lines[i].match(/^ {0,3}#{1,6}\s+(.+?)(?:\s+#+\s*)?$/);
    const setext = lines[i].trim() && /^ {0,3}(?:=+|-+)\s*$/.test(lines[i + 1] ?? "");
    const title = atx ? headingText(atx[1]) : setext ? headingText(lines[i]) : "";
    if (title) return title;
  }
  return null;
}

export function resolveSupportingMetadata({ override = {}, body = "", filename, skillTitle }) {
  const presentation = validatePresentation(override, filename);
  const title = presentation.title || markdownHeading(body) || filename;
  return {
    title,
    description: presentation.description || `${title} — supporting documentation for ${skillTitle}.`,
  };
}

export function socialImageForSkill(slug) {
  return slug === "us-llc-state-cost"
    ? {
        socialImage: "/social/us-llc-state-cost-v1.png",
        socialImageAlt: "Merze Skills — US LLC Incorporation State Comparison",
      }
    : {
        socialImage: "/social/merze-skills-v1.png",
        socialImageAlt: "Merze Skills — public Agent Skills",
      };
}
