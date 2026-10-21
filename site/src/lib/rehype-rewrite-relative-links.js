import { visit } from "unist-util-visit";

/**
 * Rewrite relative links/images in skill markdown.
 * Sibling .md → rendered sub-page; other paths → GitHub blob/raw.
 */
export function rehypeRewriteRelativeLinks() {
  return (tree, file) => {
    const slug = resolveSkillSlug(file);
    if (!slug) return;

    visit(tree, "element", (node) => {
      if (node.tagName === "a" && node.properties?.href) {
        node.properties.href = rewriteHref(String(node.properties.href), slug);
      }
      if (node.tagName === "img" && node.properties?.src) {
        node.properties.src = rewriteImgSrc(String(node.properties.src), slug);
      }
    });
  };
}

function resolveSkillSlug(file) {
  const candidates = [
    file?.data?.astro?.frontmatter?.name,
    file?.dirname,
    file?.path,
    file?.history?.[0],
  ].filter(Boolean);

  for (const c of candidates) {
    const s = String(c).replace(/\\/g, "/");
    const m = s.match(/\/([a-z0-9-]+)\/(?:SKILL|[^/]+)\.md$/i);
    if (m) return m[1];
    const m2 = s.match(/\/([a-z0-9-]+)\/?$/i);
    if (m2 && !["site", "src", "content", "pages"].includes(m2[1])) {
      return m2[1];
    }
  }

  const id = file?.data?.astro?.localInfo?.id ?? file?.id;
  if (id) {
    const first = String(id).replace(/\\/g, "/").split("/")[0];
    if (/^[a-z0-9-]+$/.test(first)) return first;
  }

  return null;
}

function rewriteHref(href, slug) {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("#") ||
    href.startsWith("/")
  ) {
    return href;
  }

  const [pathPart, hash = ""] = href.split("#");
  const hashSuffix = hash ? `#${hash}` : "";
  const cleaned = pathPart.replace(/^\.\//, "");

  if (/\.md$/i.test(cleaned) && !cleaned.includes("/")) {
    const fileSlug = cleaned.replace(/\.md$/i, "");
    // SKILL.md is the skill detail page, not a supporting sub-page
    if (fileSlug.toLowerCase() === "skill") {
      return `/${slug}/${hashSuffix}`;
    }
    return `/${slug}/${fileSlug}/${hashSuffix}`;
  }

  if (/\.md$/i.test(cleaned)) {
    const parts = cleaned.split("/");
    const file = parts.pop().replace(/\.md$/i, "");
    const nested = parts.filter((p) => p !== "..").join("/");
    if (!nested || nested === ".") {
      if (file.toLowerCase() === "skill") {
        return `/${slug}/${hashSuffix}`;
      }
      return `/${slug}/${file}/${hashSuffix}`;
    }
  }

  return `https://github.com/Merze-io/skills/blob/main/${slug}/${cleaned}${hashSuffix}`;
}

function rewriteImgSrc(src, slug) {
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("/")
  ) {
    return src;
  }
  const cleaned = src.replace(/^\.\//, "");
  return `https://raw.githubusercontent.com/Merze-io/skills/main/${slug}/${cleaned}`;
}
