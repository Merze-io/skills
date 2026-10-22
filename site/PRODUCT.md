# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary visitor: someone installing Merze agent skills into the agent they already use — public ChatGPT, Claude (web/app), Cursor, Claude Code, and similar skill-capable agents. Situation: they need a trusted place to discover, search, and download install-ready skill packages for formation, compliance, and ops work, then load those files wherever their agent expects skills. Job: find the right skill fast, understand what it does, and get every file onto disk (or into the agent’s skill install path) via install commands or direct downloads — without assuming a single IDE.

Secondary: Merze team publishing and verifying public skills for the catalog.

## Product Purpose

**Merze Skills** (`skills.merze.ai`) is the public catalog for Merze Agent Skills. Success means a visitor can browse or search skills, open a detail page, and install or download every allowlisted skill file for use in public ChatGPT, Claude, Cursor, Claude Code, or other skill-capable agents — without leaving this site or guessing GitHub paths.

## Positioning

Merze-owned distribution for agent skills tied to Merze’s formation, tax, and compliance domain — not a generic skills directory. Skills ship with install commands pointed at this catalog (`npx skills add https://skills.merze.ai …`) and locked-down `/files/` publishing.

## Operating Context

- Static Astro site with Pagefind search, skill filters, detail pages, about/docs.
- Install surfaces: `npx skills`, curl tar, PowerShell zip → `~/.agents/skills/`.
- CI builds `dist/`, publishes allowlisted files, runs install smoke and Docker (Coolify-style).
- Live catalog: https://skills.merze.ai — parent brand: https://merze.ai

## Capabilities and Constraints

- Browse/search catalog; filter skills; skill detail with prose, TOC, install/download of every allowlisted file.
- Allowlist only: `md`, `txt`, `json`, `yaml`/`yml`, `csv`. No symlinks; path safety via `skill-sources`.
- Fail-closed scrub of disallowed “github” substrings in `dist/` (allowlist: literal `github-copilot`).
- Do not invent skills, pricing, customer claims, or capabilities not in the repo.
- Stack is incumbent Astro (not greenfield); preserve routes, install semantics, and publishing policy.

## Brand Commitments

- Product name: **Merze Skills**; parent brand **Merze**.
- Binding visual constraint (user): follow **merze.ai colour theme** for this redesign (deep navy ground, orange accent punctuation/action, modern Merze marketing presence — not a generic AI-catalog look).
- Existing assets: `/logo.png`, `/favicon.png` (and related public brand marks).
- Voice: clear, operator-facing, founder/compliance-adjacent — no hype claims the product cannot back.
- Skills are agent-agnostic packages: UI and copy must not imply Cursor-only or “coding IDE only”; ChatGPT and Claude (public) are first-class destinations alongside Cursor and Claude Code.
- Standing craft preference (user, safer canon): play the category standard straight — craft level of **skills.sh**, **Claude skill docs**, and **Cursor skills UI**, with Merze navy/orange identity. No smuggled quirk or ironic costume.

## Evidence on Hand

- Live site and repo skill: `us-llc-state-cost` (SKILL.md + states.md).
- Site copy on index, about, and skill detail; `skills.json` / discovery index at build time.
- Parent marketing reference: merze.ai (colour and atmosphere only; do not copy product claims onto the skills catalog).
- No fabricated testimonials, install counts, or customer logos.

## Product Principles

1. **Install is the product** — every surface should make getting skill files into the visitor’s agent (ChatGPT, Claude, Cursor, Claude Code, etc.) obvious and correct.
2. **Merze domain, not generic tooling** — catalog stays tied to formation/compliance/ops skills Merze publishes.
3. **Trust through constraints** — allowlisted files, locked `/files/`, fail-closed scrub; UX must not fight those rules.
4. **Parent brand continuity** — skills.merze.ai should feel like Merze’s catalog, not an anonymous AI template.
5. **Do not invent proof** — only real skills, versions, and install paths from the repo.

## Accessibility & Inclusion

Meet WCAG-oriented practices already present (skip link, focus rings, `aria-live` for search/filter counts, reduced-motion respect). No additional product-specific accessibility standard was established beyond preserving and improving those behaviors.
