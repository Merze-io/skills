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

Shared helper: `src/lib/skill-sources.mjs` (+ typed re-export `skill-sources.ts`). MER-1098 imports the same module — do not fork the path rule.

- Allowlist extensions only: `md`, `txt`, `json`, `yaml`/`yml`, `csv`
- Strict relative paths via `assertSafeSkillRelativePath`: each segment matches `[A-Za-z0-9._-]+`, no leading dot, no `..`, no `\`, no control chars, no absolute paths
- Symlinks fail the build
- Refuse paths that resolve outside the skill folder
- Disallowed files (e.g. `.svg`, `.html`, `.env`) fail the build
- Install commands use `curl --create-dirs`, shell-quoted paths, and URL-encoded segments; `SKILL.md` is listed first
- nginx `location /files/` serves `text/plain; charset=utf-8`, `nosniff`, CSP `default-src 'none'; sandbox`

## GitHub substring gate

Single scanner: `scripts/scrub-github.mjs` (also re-run in CI).

- Scrubs Pagefind UI translator credit URLs
- Fail closed: scans every file under `dist/`
- Gunzips any buffer starting with gzip magic `1f 8b` (Pagefind `.pf_*`, `wasm.*.pagefind`)
- PNG `tEXt` / `zTXt` / `iTXt` chunk payloads are inflated and scanned
- Unreadable files fail the build (no warn-and-skip)
- Allowlist only: the literal term `github-copilot`
- Any other hit — including skill content under `dist/files/` — fails the build
- Known gap (accepted for static assets): only one gzip layer is peeled, and deflate/brotli payloads inside fonts (e.g. `.woff2`) are not opened — double-gzip or font-compressed `github` can still slip through

## Content collection vs `/files/`

The Astro content glob can follow symlinks. Collection entries are filtered through the same `skill-sources` rules (`isSafeSkillSourceFile`). Symlinks anywhere in a skill folder fail the publisher (`listSafeSkillFiles`). Install lists come from `listSafeSkillFiles` so they cannot drift from `/files/`.
