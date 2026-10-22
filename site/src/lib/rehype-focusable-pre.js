/**
 * Mark markdown <pre> blocks keyboard-focusable so overflow-x:auto
 * regions satisfy WCAG 2.1.1 / axe scrollable-region-focusable.
 */
export function rehypeFocusablePre() {
  return (tree) => {
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "element" && node.tagName === "pre") {
        node.properties ??= {};
        if (node.properties.tabIndex == null && node.properties.tabindex == null) {
          node.properties.tabIndex = 0;
        }
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) visit(child);
      }
    };
    visit(tree);
  };
}
