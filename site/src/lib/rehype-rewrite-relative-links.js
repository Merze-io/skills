import { visit } from "unist-util-visit";
import path from "node:path";

/**
 * Rewrite relative links/images in skill markdown.
 * Sibling .md → rendered sub-page; cross-skill ../ paths → other skill URLs;
 * other relative files → same-origin /files/<skill>/… downloads.
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

function toSitePath(skill, file, hashSuffix) {
  if (!file || file.toLowerCase() === "skill.md" || file.toLowerCase() === "skill") {
    return `/${skill}/${hashSuffix}`;
  }
  const fileSlug = file.replace(/\.md$/i, "");
  return `/${skill}/${fileSlug}/${hashSuffix}`;
}

function fileDownloadPath(skill, filePath) {
  const cleaned = String(filePath).replace(/^\/+/, "");
  return `/files/${skill}/${cleaned}`;
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

  // Resolve against the current skill directory (posix)
  const resolved = path.posix.normalize(`${slug}/${cleaned}`);

  // Escaped the repo root — keep on-site as a file download under this skill
  if (resolved.startsWith("..") || path.posix.isAbsolute(resolved)) {
    return `${fileDownloadPath(slug, cleaned)}${hashSuffix}`;
  }

  const parts = resolved.split("/").filter(Boolean);
  if (parts.length === 0) {
    return `/${slug}/${hashSuffix}`;
  }

  const targetSkill = parts[0];
  const rest = parts.slice(1).join("/");

  if (/\.md$/i.test(rest) || (parts.length === 1 && /\.md$/i.test(targetSkill))) {
    if (parts.length === 1 && /\.md$/i.test(targetSkill)) {
      return toSitePath(slug, targetSkill, hashSuffix);
    }
    return toSitePath(targetSkill, rest, hashSuffix);
  }

  // Non-markdown relative file → same-origin download
  if (rest) {
    return `${fileDownloadPath(targetSkill, rest)}${hashSuffix}`;
  }

  return `/${targetSkill}/${hashSuffix}`;
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
  const resolved = path.posix.normalize(`${slug}/${cleaned}`);
  if (resolved.startsWith("..")) {
    return fileDownloadPath(slug, cleaned);
  }
  const parts = resolved.split("/").filter(Boolean);
  if (parts.length < 2) return fileDownloadPath(slug, cleaned);
  const targetSkill = parts[0];
  const rest = parts.slice(1).join("/");
  return fileDownloadPath(targetSkill, rest);
}
