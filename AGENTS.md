# Agent instructions (Merze-io/skills)

## Read first

1. `docs/agent/system-map.md` — catalog flow, routes, Coolify, safety.
2. `docs/agent/repo-map.md` — layout, commands, ports, branching.
3. For browser verification. `.cursor/skills/verify-merze-skills/SKILL.md`.

## Required checks before claiming done

From `site`:

```bash
npm ci
npm run build
npm run check-skill-dates
npm run check-redirect-cases
npm run verify-dist
```

From repo root:

```bash
node scripts/check-agent-maps.mjs
```

If the change touches UI, launch the verify stack and prove the affected surface with a screenshot.

## Forbidden without an explicit ticket ask

- Merging to `main`
- Deploying or force-rebuilding production Coolify app `skills` (`skills.merze.ai`)
- Inventing catalog skills, pricing, or install claims not in the repo
- Weakening the github scrub / file allowlist in `site/src/lib/skill-sources.mjs`

## Maps must stay true

When a change moves a flow step or route, update `docs/agent/system-map.md` and `docs/agent/repo-map.md` in the same PR. `scripts/check-agent-maps.mjs` fails CI if a cited path disappears.
