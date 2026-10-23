## Goal

Add a "Copy for chat agents" copy button to each skill card on the catalog home page (`/`), allowing users to copy the chat agents commands directly from the catalog page without having to visit the skill detail page. The copy button must provide visual feedback ("Copied") upon successful copy.

## Non-goals

- Changing the skill detail page copy buttons or install behavior.
- Adding unallowlisted skill files or modifying scraper scrubbing rules.
- Deploying to production Coolify.

## Files

- `site/src/lib/skills.ts`
- `site/src/components/SkillFilters.astro`
- `site/src/styles/global.css`

## Acceptance criteria

- [ ] AC1: `site/src/lib/skills.ts` exposes `getChatAgentPaste(slug)` and includes `chatAgentPaste` string in `SkillListItem`.
- [ ] AC2: `site/src/components/SkillFilters.astro` renders a `CopyButton` with `text={skill.chatAgentPaste}` and `label="Copy for chat agents"` inside each skill card.
- [ ] AC3: Clicking the copy button on any catalog skill card copies the chat agent commands to clipboard, displays "Copied" feedback, and does not trigger card navigation.
- [ ] AC4: All site build checks and agent maps validation pass successfully (`npm run build`, `npm run check-skill-dates`, `npm run check-redirect-cases`, `npm run verify-dist` in `site`, and `node scripts/check-agent-maps.mjs` from repo root).

## Checks

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

## QA script

1. Launch verify stack: `bash .cursor/skills/verify-merze-skills/scripts/launch.sh`
2. Run doctor check: `bash .cursor/skills/verify-merze-skills/scripts/doctor.sh`
3. Confirm via browser / curl against `http://localhost:4322/` that each skill card in the catalog page renders a "Copy for chat agents" button.
4. Click the copy button and confirm it displays "Copied" feedback and correctly copies the chat agent commands payload to the clipboard without triggering card link navigation.
5. Teardown verify stack: `bash .cursor/skills/verify-merze-skills/scripts/cleanup.sh`
6. Assert deployed staging environment `https://skills.dev.merze.ai/` renders the copy buttons on catalog cards after deploy.
