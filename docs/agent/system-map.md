# Merze skills system map

Read this before exploring. Cite the step and path when writing a spec.

## End-to-end flow

```text
Catalog home (index.astro)
  → Search / filter skills
  → Skill detail (/skill/<slug>)
  → Install / download allowlisted files + zip/tar
  → Visitor loads skill into ChatGPT / Claude / Cursor / Claude Code
```

Build publishes static `dist/` (Pagefind + nginx redirects). Coolify serves the Docker image from `site/Dockerfile`.

## Steps

### 1. Catalog UI

- **Code.** `site/src/pages/index.astro`, `site/src/components/SkillFilters.astro`, `site/src/components/PagefindSearch.astro`.
- **Brand.** Merze navy/orange. Assets in `site/public/logo.png`, `site/public/favicon.png`.
- **Proof.** Browser against verify stack or staging / prod URL. Gateway. none for static HTML.

### 2. Skill packages

- **Code.** Repo-root folders with `SKILL.md` (e.g. `us-llc-state-cost/`). Nested docs like `us-llc-state-cost/states.md`.
- **Discovery.** `site/src/lib/skills.ts` + frontmatter validation.
- **Dates.** `site/data/skill-dates.json` (regenerate with `npm run generate-skill-dates` after squash/rebase).
- **Safety.** Do not invent skills. Underscore draft folders (`_drafts`) are ignored.

### 3. Skill detail + install surfaces

- **Code.** `site/src/pages/skill/[name]/index.astro`, `site/src/pages/skill/[name]/[doc].astro`.
- **Distribution.** `site/src/lib/distribution.ts`, `site/src/integrations/distribution.ts`.
- **Allowlist.** `site/src/lib/skill-sources.mjs` — md/txt/json/yaml/yml/csv only. No symlinks.
- **Artifacts.** Per-skill zip/tar, `skills.json`, `.well-known/agent-skills/index.json`, `llms.txt`.
- **Legacy path.** `/files/` 301s to `/skill/`.

### 4. Build gates

- **Dates / redirects.** `npm run check-skill-dates`, `npm run check-redirect-cases`.
- **Scrub.** `site/scripts/scrub-github.mjs` fail-closed (allowlist literal `github-copilot`).
- **Verify.** `npm run verify-dist`.
- **CI.** `.github/workflows/site.yml` (build + docker smoke).

### 5. Deploy

- **Staging (harness target).** Coolify app on branch `develop` → `https://skills.dev.merze.ai`. Health `GET /healthz`.
- **Production.** Coolify app `skills` uuid `voo7amqb3tnf6uavnitfpqyf` on `main` → `https://skills.merze.ai`.
- **Safety.** Agents merge only to `develop`. Humans promote `develop` → `main`.

## Env

Static site. No Appwrite/Stripe/OpenAI for the catalog. Docker build args `SOURCE_DATE` / `SOURCE_DATE_EPOCH` must not blanket `updated_at` (manifest in `site/data/skill-dates.json` wins).

## Yūsetu / gateways

- Coolify. `merze-coolify` for deploy diagnostics.
- No product MCP for the catalog content itself.
