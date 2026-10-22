/**
 * GFM task-list checkboxes are disabled indicators without labels.
 * Give them an accessible name so axe "label" passes.
 */
export function rehypeLabelTaskListCheckboxes() {
  return (tree) => {
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "element" && node.tagName === "input") {
        const type = node.properties?.type;
        const isCheckbox =
          type === "checkbox" ||
          (Array.isArray(type) && type.includes("checkbox"));
        if (isCheckbox) {
          node.properties ??= {};
          if (
            node.properties.ariaLabel == null &&
            node.properties["aria-label"] == null
          ) {
            const checked = Boolean(node.properties.checked);
            node.properties.ariaLabel = checked
              ? "Completed task"
              : "Incomplete task";
          }
        }
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) visit(child);
      }
    };
    visit(tree);
  };
}
