# Design system — skills.merze.ai

Canon category-standard catalog (safer hand), craft bar: skills.sh, Claude skill docs, Cursor skills UI. Merze navy/orange identity. User steer: minimal icons, simple Merze colours, logo from merze.ai.

## Brand

- Product: **Merze Skills** (catalog at skills.merze.ai)
- Logo: `/merze-mark.png` (official Merze M mark from merze.ai) + **MERZE** word + Skills label
- Brand / chrome: `#112E51` (navy), heading `#00278A`, hover `#0A1D35`
- Link / focus: `#205493`
- Accent (periods, current nav underline, selected chips, version badges, card hover): `#FF7744`
- Surfaces: white `#FFFFFF` with light `#F3F6FB` panels

## Type

- Face: **Rethink Sans** (self-hosted via `@fontsource/rethink-sans`) — not Inter
- Hero: brand-first title with orange period; agent destinations as text chips (no iconography)
- Body: ~1rem / 1.55, measure ~70ch on prose

## Layout

- Solid header (no frosted glass)
- Hero: brand + lede + agent chips + count; search immediately below
- Catalog: Pagefind search + optional facet chips + skill cards (colour accents, no decorative icons)
- Detail / About: unchanged function; About copy is agent-agnostic

## Motion

- Prefer already-visible defaults; short border/colour transitions
- Respects `prefers-reduced-motion`

## States

- Empty filters with clear action; `aria-live` announces result counts
- Copy controls update visible label + polite status
- Focus rings on interactive controls; themed selection / caret

## /files/ publishing policy

Unchanged — see prior DESIGN.md section; `src/lib/skill-sources.mjs` remains the single path rule. Allowlist, scrub-github gate, and content collection rules still apply.
