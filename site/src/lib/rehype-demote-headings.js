import { visit } from "unist-util-visit";

/**
 * Detail pages already have an h1 (skill name).
 * - Drop a leading H1 (duplicates the page title).
 * - Map remaining headings to h2/h3 so heading order stays valid.
 */
export function rehypeDemoteHeadings() {
  return (tree) => {
    let sawContent = false;
    const remove = [];

    visit(tree, "element", (node, index, parent) => {
      if (!/^h[1-6]$/.test(node.tagName)) return;

      // First heading that is an h1 → remove (title already in page chrome)
      if (!sawContent && node.tagName === "h1" && parent && typeof index === "number") {
        remove.push({ parent, index });
        sawContent = true;
        return;
      }
      sawContent = true;

      const level = Number(node.tagName[1]);
      if (level <= 1) node.tagName = "h2";
      else node.tagName = "h3";
    });

    // Remove in reverse index order so indices stay valid
    for (const { parent, index } of remove.sort((a, b) => b.index - a.index)) {
      parent.children.splice(index, 1);
    }
  };
}
