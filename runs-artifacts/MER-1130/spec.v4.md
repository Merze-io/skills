## Goal

Update the catalog skill cards on the home page (`/`) to include a copy button positioned **inside** the card box (specifically in the card header `.skill-card__top`), formatted as an icon-only button with a hover tooltip/title ("Copy for Agents"). Clicking the button copies the chat agents commands directly to clipboard with "Copied" visual feedback, without triggering skill card navigation.

## Non-goals

- Changing skill detail page copy buttons or install behavior.
- Adding unallowlisted skill files or modifying scraper scrubbing rules.
- Deploying to production Coolify.

## Files

- `site/src/components/CopyButton.astro`
- `site/src/components/SkillFilters.astro`
- `site/src/styles/global.css`

## Acceptance criteria

- [ ] AC1: `CopyButton.astro` supports an `iconOnly` prop and `title`/`aria-label` attribute when icon-only mode is enabled.
- [ ] AC2: `SkillFilters.astro` places the `<CopyButton>` inside the skill card box (within `.skill-card__top`) with `iconOnly={true}` and `label="Copy for Agents"`, passing `text={skill.chatAgentPaste}`.
- [ ] AC3: Clicking the copy button copies the chat agent commands to the clipboard, displays "Copied" feedback, and stops event propagation so card link navigation is not triggered.
- [ ] AC4: CSS in `global.css` correctly styles the icon-only copy button inside skill cards with appropriate hover tooltip and layout.
- [ ] AC5: All site build checks and agent maps validation pass successfully (`npm run build`, `npm run check-skill-dates`, `npm run check-redirect-cases`, `npm run verify-dist` in `site`, and `node scripts/check-agent-maps.mjs` from repo root).

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
3. Confirm via browser against `http://localhost:4322/` that each skill card renders the icon-only copy button inside the card header box (`.skill-card__top`), with a hover title/tooltip showing "Copy for Agents".
4. Click the copy button on a skill card and verify it displays "Copied" feedback, copies the chat agent commands to clipboard, and does not open the skill detail page.
5. Teardown verify stack: `bash .cursor/skills/verify-merze-skills/scripts/cleanup.sh`
6. Assert deployed staging environment `https://skills.dev.merze.ai/` renders the icon-only copy buttons inside the catalog skill card boxes.
