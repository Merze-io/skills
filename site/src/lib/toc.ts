import GithubSlugger from "github-slugger";

export type TocItem = {
  depth: number;
  text: string;
  id: string;
};

export function extractToc(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  const lines = markdown.split("\n");
  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    // Match h1–h3 in source; rendered as h2 (for #) or h3 (for ##+).
    const match = /^(#{1,3})\s+(.+)$/.exec(line);
    if (!match) continue;
    const depth = match[1].length <= 1 ? 2 : 3;
    const text = match[2].replace(/#+\s*$/, "").trim();
    if (!text) continue;
    items.push({ depth, text, id: slugger.slug(text) });
  }

  return items;
}
