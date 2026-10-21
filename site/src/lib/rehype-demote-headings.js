import { visit } from "unist-util-visit";

/**
 * Detail pages already have an h1 (skill name). Map markdown headings to
 * h2/h3 only so we never skip a level (WCAG heading-order).
 *   # → h2, ## → h3, ###+ → h3
 */
export function rehypeDemoteHeadings() {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (!/^h[1-6]$/.test(node.tagName)) return;
      const level = Number(node.tagName[1]);
      if (level <= 1) node.tagName = "h2";
      else node.tagName = "h3";
    });
  };
}
