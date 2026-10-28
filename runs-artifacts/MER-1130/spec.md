# Specification: MER-1130 - UI UX - In catalog page add copy button with copied feedback

## Goal

Update the catalog skill cards on the home page (`/`) so that:
1. Each skill card includes an icon-only copy button located **inside** the card header (`.skill-card__top`), configured with `label="Copy for Agents"` and `iconOnly={true}`.
2. Hovering over the copy button displays the "Copy for Agents" tooltip **instantly** (0ms delay via CSS pseudo-element tooltip instead of native `title` delay).
3. Clicking the copy button copies the skill's chat agents commands (`skill.chatAgentPaste`) directly to the clipboard, displays "Copied" feedback, and **does not** navigate or open the skill details page.

## Non-goals

- Changing skill detail page copy buttons or install behavior.
- Adding unallowlisted skill files or modifying scraper scrubbing rules.
- Deploying to production Coolify.

## Files

- `site/src/components/CopyButton.astro`
- `site/src/components/SkillFilters.astro`
- `site/src/styles/global.css`

## Acceptance criteria

- [ ] AC1: `CopyButton.astro` supports an `iconOnly` prop, accepts an instant CSS-based tooltip attribute (or `data-tooltip`) for instant hover display ("Copy for Agents"), and calls both `e.preventDefault()` and `e.stopPropagation()` on click.
- [ ] AC2: `SkillFilters.astro` places the `<CopyButton>` inside the skill card box (within `.skill-card__top`) with `iconOnly={true}` and `label="Copy for Agents"`, passing `text={skill.chatAgentPaste}`.
- [ ] AC3: Skill card navigation and copy button interactions are structured cleanly (using a stretched link or non-nested interactive structure) so that clicking the copy button executes the copy action and feedback without triggering card navigation to `/skill/${slug}`.
- [ ] AC4: CSS in `global.css` defines an instant hover tooltip for `[data-tooltip]` (or `.copy-btn`) and correct card link separation/styling.
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
3. Confirm via browser against `http://localhost:4322/` that each skill card renders the icon-only copy button inside the card header box (`.skill-card__top`), and hovering over the button instantly shows the "Copy for Agents" tooltip.
4. Click the copy button on a skill card and verify it displays "Copied" feedback, copies the chat agent commands to clipboard, and **does not** open the skill detail page.
5. Teardown verify stack: `bash .cursor/skills/verify-merze-skills/scripts/cleanup.sh`
6. Assert deployed staging environment `https://skills.dev.merze.ai/` renders the icon-only copy buttons inside the catalog skill card boxes with instant hover tooltips and non-navigating copy clicks.
