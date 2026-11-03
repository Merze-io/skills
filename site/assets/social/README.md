# Social card assets (1200×630)

Committed preview images for `skills.merze.ai`, with their editable sources and
a reproducible, offline generator.

| Card | Source template | Committed PNG |
| --- | --- | --- |
| Catalog | `merze-skills-v1.html` | `../public/social/merze-skills-v1.png` |
| Skill: US LLC Incorporation State Comparison | `us-llc-state-cost-v1.html` | `../public/social/us-llc-state-cost-v1.png` |

## Render

From `site/`:

```bash
node scripts/generate-social-images.mjs                      # every card
node scripts/generate-social-images.mjs us-llc-state-cost-v1  # one card
node scripts/generate-social-images.mjs --check               # verify, write nothing
```

The PNGs are committed. Rendering is a manual job: it is not part of
`npm run build`, CI, or any runtime path, and it adds no dependency to the
site (Puppeteer is already a devDependency).

Browser: `PUPPETEER_EXECUTABLE_PATH` if set, else Puppeteer's own download,
else the newest complete Chrome in `~/.cache/puppeteer/chrome`, else system
Chrome. A half-extracted cache entry (binary without
`Contents/Frameworks`) is skipped.

## How the templates work

- Self-contained HTML at exactly 1200×630 and `deviceScaleFactor: 1`, so the
  PNG is pixel-for-pixel.
- Rethink Sans comes from `fonts/` (copied latin subsets of
  `@fontsource/rethink-sans`, the package the site already uses). The mark is
  `../public/merze-mark.png`, the official asset the header uses.
- No network: the generator aborts the run if any request is not `file://` or
  `data:`, and it fails on page errors.
- All key text carries `data-safe`. The generator measures each block and fails
  if text leaves the 64px safe inset or spills off the canvas.
- Colours, type sizes, and spacing are CSS custom properties at the top of each
  file. Edit the template, then re-render.

## Copy rules

- Catalog card: Merze Skills, agent skills for formation, compliance and ops,
  agent names from `src/pages/index.astro`, domain `skills.merze.ai`.
- Skill card: describes `us-llc-state-cost` only. No fee amounts, no ratings,
  no counts, no performance claims. Keep "Domestic LLC only" and the
  "not legal or tax advice" line.
- New card = new versioned filename (`-v2`), never a silent overwrite.

## Repository note

`site/.gitignore` has `assets/`, which also ignores this directory. To commit
the sources, replace that line with:

```gitignore
assets/*
!assets/social/
```

The generated PNGs under `site/public/social/` are not ignored.
