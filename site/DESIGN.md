# Design system — skills.merze.ai

Derived from the MER-1097 redesign (light Merze brand, Inter, navy).

## Brand

- Product: **Merze Skills** (catalog at skills.merze.ai)
- Logo / favicon: existing `/logo.png`, `/favicon.png`
- Primary: `#112E51` (navy)
- Link / focus: `#205493`
- Accent (sparse): `#E85D2A`
- Surfaces: cool tinted light (`#F7F9FC` → white), not cream

## Type

- Face: Inter Variable (self-hosted via `@fontsource-variable/inter`)
- Display: brand name as hero `h1`, clamp ~2.5–4rem, tracking ≤ -0.035em
- Body: 1rem / 1.6, measure ~70ch on prose

## Layout

- Sticky translucent header
- Hero: brand + one lede + CTA pair + count
- Catalog: Pagefind search (lazy) + optional facet chips + skill cards
- Detail: summary meta, install via same-origin download/copy, prose + TOC

## Motion

- Hero enter (opacity + slight rise + blur clear)
- Catalog rise-in
- Card hover lift
- Respects `prefers-reduced-motion`

## States

- Empty filters, brief loading pulse on filter change, 404 with search
- Focus rings on interactive controls; themed selection / caret
