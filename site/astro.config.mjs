import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { rehypeRewriteRelativeLinks } from "./src/lib/rehype-rewrite-relative-links.js";
import { rehypeDemoteHeadings } from "./src/lib/rehype-demote-headings.js";
import { rehypeFocusablePre } from "./src/lib/rehype-focusable-pre.js";
import { rehypeLabelTaskListCheckboxes } from "./src/lib/rehype-label-task-list-checkboxes.js";
import { distributionIntegration } from "./src/integrations/distribution.ts";

const sanitizeSchema = {
  ...defaultSchema,
  // Keep heading ids as rehype-slug produces them (TOC / anchors must match).
  clobberPrefix: "",
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
    span: [...(defaultSchema.attributes?.span ?? []), "className", "style"],
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      "className",
      ["href", /^(https?:|mailto:|\/|#)/],
    ],
    h1: [...(defaultSchema.attributes?.h1 ?? []), "id", "className"],
    h2: [...(defaultSchema.attributes?.h2 ?? []), "id", "className"],
    h3: [...(defaultSchema.attributes?.h3 ?? []), "id", "className"],
    h4: [...(defaultSchema.attributes?.h4 ?? []), "id", "className"],
    h5: [...(defaultSchema.attributes?.h5 ?? []), "id", "className"],
    h6: [...(defaultSchema.attributes?.h6 ?? []), "id", "className"],
    pre: [...(defaultSchema.attributes?.pre ?? []), "className", "tabindex"],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      "src",
      "alt",
      "title",
      "width",
      "height",
      "loading",
      "decoding",
    ],
    table: [...(defaultSchema.attributes?.table ?? []), "className"],
    th: [...(defaultSchema.attributes?.th ?? []), "align"],
    td: [...(defaultSchema.attributes?.td ?? []), "align"],
  },
};

function stripTrailingSlash(url) {
  if (url === "https://skills.merze.ai/" || url === "/") return url;
  return url.replace(/\/$/, "");
}

export default defineConfig({
  site: "https://skills.merze.ai",
  output: "static",
  trailingSlash: "never",
  build: {
    format: "directory",
  },
  integrations: [
    sitemap({
      // Directory format may emit trailing slashes; canonical policy is never.
      serialize(item) {
        item.url = stripTrailingSlash(item.url);
        return item;
      },
    }),
    distributionIntegration(),
  ],
  markdown: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      // Sanitize raw HTML first, then add ids/classes/rewrites that must survive.
      [rehypeSanitize, sanitizeSchema],
      rehypeDemoteHeadings,
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "wrap",
          properties: { className: ["heading-anchor"] },
        },
      ],
      rehypeRewriteRelativeLinks,
      // After sanitize so tabindex / aria-label survive.
      rehypeFocusablePre,
      rehypeLabelTaskListCheckboxes,
    ],
    shikiConfig: {
      theme: "min-light",
      wrap: true,
    },
  },
});
