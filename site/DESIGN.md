# Design system — skills.merze.ai

Derived from the MER-1097 redesign (light Merze brand, Inter, navy).

## Brand

- Product: **Merze Skills** (catalog at skills.merze.ai)
- Logo / favicon: existing `/logo.png`, `/favicon.png`
- Brand / chrome: `#112E51` (navy), hover `#0A1D35`
- Headings: `#00278A` (≥12:1 on white)
- Link / focus: `#205493`
- Accent (fills/borders only, not body text): `#FF7744`
- Surfaces: flat white `#FFFFFF` with light `#F3F6FB` panels — no decorative blobs or glow halos

## Type

- Face: Inter Variable (self-hosted via `@fontsource-variable/inter`)
- Compact hero so search + skill cards start above the fold at 320/360
- Body: 1rem / 1.6, measure ~70ch on prose

## Layout

- Solid header (no frosted glass)
- Hero: brand + one lede + count
- Catalog: Pagefind search (lazy) + optional facet chips + skill cards (no hover lift)
- Detail: summary meta, install downloads every skill file, prose + TOC

## Motion

- Prefer already-visible defaults; no section fade-in that hides content at load
- Respects `prefers-reduced-motion`

## States

- Empty filters with clear action; `aria-live` announces real result counts
- Copy controls update visible label + polite status; never claim success on failure
- Focus rings on interactive controls; themed selection / caret

## /files/ publishing policy

Shared helper: `src/lib/skill-sources.mjs` (+ typed re-export `skill-sources.ts`).

- Allowlist extensions only: `md`, `txt`, `json`, `yaml`/`yml`, `csv`
- Skip symlinks; refuse paths that resolve outside the skill folder
- Disallowed files (e.g. `.svg`, `.html`, `.env`) fail the build
- nginx `location /files/` serves `text/plain; charset=utf-8`, `nosniff`, CSP `default-src 'none'; sandbox`

## GitHub substring gate

Single scanner: `scripts/scrub-github.mjs` (also re-run in CI).

- Scrubs Pagefind UI translator credit URLs
- Scans text assets and decompressed Pagefind `.pf_*` indexes
- Allowlist only: leftover `github` inside `pagefind/*.{js,wasm}` after scrub, and the literal term `github-copilot`
- Any other hit — including skill content under `dist/files/` — fails the build
