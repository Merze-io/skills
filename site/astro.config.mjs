import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { rehypeRewriteRelativeLinks } from "./src/lib/rehype-rewrite-relative-links.js";
import { rehypeDemoteHeadings } from "./src/lib/rehype-demote-headings.js";

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

export default defineConfig({
  site: "https://skills.merze.ai",
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap()],
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
    ],
    shikiConfig: {
      theme: "github-light",
      wrap: true,
    },
  },
  vite: {
    define: {
      "import.meta.env.SOURCE_DATE": JSON.stringify(
        process.env.SOURCE_DATE ?? process.env.SOURCE_COMMIT_DATE ?? "",
      ),
      "import.meta.env.SOURCE_COMMIT": JSON.stringify(
        process.env.SOURCE_COMMIT ?? "",
      ),
    },
  },
});
