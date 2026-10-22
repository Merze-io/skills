/**
 * Heading slugger compatible with rehype-slug / commonmark heading ids.
 */
export class HeadingSlugger {
  #seen = new Map<string, number>();

  slug(value: string): string {
    let base = value
      .toLowerCase()
      .trim()
      .replace(/<[^>]+>/g, "")
      .replace(/['’]/g, "")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!base) base = "section";

    const count = this.#seen.get(base) ?? 0;
    this.#seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  }

  reset(): void {
    this.#seen.clear();
  }
}
