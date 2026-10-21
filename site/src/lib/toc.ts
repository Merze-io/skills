import GithubSlugger from "github-slugger";

export type TocItem = {
  depth: number;
  text: string;
  id: string;
};

/**
 * Mirror rehypeDemoteHeadings: drop leading H1, then assign depths that
 * never skip a level under the page h1.
 */
export function extractToc(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  const lines = markdown.split("\n");
  let inFence = false;
  let sawHeading = false;
  let lastLevel = 1;

  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (!match) continue;

    const original = match[1].length;
    const text = match[2].replace(/#+\s*$/, "").trim();
    if (!text) continue;

    if (!sawHeading && original === 1) {
      sawHeading = true;
      continue;
    }
    sawHeading = true;

    let depth = original + 1;
    if (depth > lastLevel + 1) depth = lastLevel + 1;
    depth = Math.min(Math.max(depth, 2), 6);
    lastLevel = depth;

    items.push({ depth, text, id: slugger.slug(text) });
  }

  return items;
}
