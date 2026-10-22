import { visit } from "unist-util-visit";

/**
 * Detail pages already have an h1 (skill / file name).
 * - Drop a leading H1 (duplicates the page title).
 * - Remap remaining headings without skipping levels (WCAG heading-order).
 */
export function rehypeDemoteHeadings() {
  return (tree) => {
    let lastLevel = 1; // page chrome provides the h1
    let sawHeading = false;
    const remove = [];

    visit(tree, "element", (node, index, parent) => {
      if (!/^h[1-6]$/.test(node.tagName)) return;

      // First heading that is an h1 → remove (title already in page chrome)
      if (!sawHeading && node.tagName === "h1" && parent && typeof index === "number") {
        remove.push({ parent, index });
        sawHeading = true;
        return;
      }
      sawHeading = true;

      const original = Number(node.tagName[1]);
      // Prefer demoting by +1 under the page h1, but never skip a level.
      let next = original + 1;
      if (next > lastLevel + 1) next = lastLevel + 1;
      next = Math.min(Math.max(next, 2), 6);
      node.tagName = `h${next}`;
      lastLevel = next;
    });

    for (const { parent, index } of remove.sort((a, b) => b.index - a.index)) {
      parent.children.splice(index, 1);
    }
  };
}
