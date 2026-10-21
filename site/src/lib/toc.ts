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
  let skippedLeadingH1 = false;

  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{1,3})\s+(.+)$/.exec(line);
    if (!match) continue;

    // Leading H1 is dropped from the rendered body (page chrome owns the title).
    if (!skippedLeadingH1 && match[1].length === 1) {
      skippedLeadingH1 = true;
      continue;
    }
    skippedLeadingH1 = true;

    const depth = match[1].length <= 1 ? 2 : 3;
    const text = match[2].replace(/#+\s*$/, "").trim();
    if (!text) continue;
    items.push({ depth, text, id: slugger.slug(text) });
  }

  return items;
}
