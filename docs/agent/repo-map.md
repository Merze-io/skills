# Merze skills repo map

## Layout

| Path | Role |
| --- | --- |
| `site/` | Astro static catalog (the product UI) |
| `site/src/pages/index.astro` | Catalog home |
| `site/src/pages/about.astro` | About |
| `site/src/pages/skill/[name]/index.astro` | Skill detail |
| `site/src/pages/skill/[name]/[doc].astro` | Nested skill docs (e.g. states) |
| `site/src/lib/skills.ts` | Skill list / frontmatter |
| `site/src/lib/skill-sources.mjs` | Allowlisted file publish rules |
| `site/src/lib/distribution.ts` | Build-time distribution artifacts |
| `site/scripts/verify-dist.mjs` | Dist integrity checks |
| `site/scripts/scrub-github.mjs` | Fail-closed github substring gate |
| `site/data/skill-dates.json` | Per-skill `updated_at` (committed) |
| `site/Dockerfile` | nginx image for Coolify |
| `us-llc-state-cost/` | First public skill package (`SKILL.md`, `states.md`) |
| `docs/agent/` | Maps for agents (this folder) |
| `.cursor/skills/verify-merze-skills/` | Browser verify skill |
| `.github/workflows/site.yml` | Build + docker smoke CI |

## Commands

From `site` (Node 22):

| Command | Purpose |
| --- | --- |
| `npm run dev` | Astro local catalog (default port `4321`) |
| `npm run build` | Astro build + pagefind + nginx redirects + scrub |
| `npm run check-skill-dates` | Fail if `data/skill-dates.json` is stale |
| `npm run check-redirect-cases` | Fail if redirect TSV is stale |
| `npm run verify-dist` | Dist schema/digest checks |
| `npm run axe:viewports` | Axe at 320 / 360 / 1280 |

From repo root:

| Command | Purpose |
| --- | --- |
| `node scripts/check-agent-maps.mjs` | Fail if map-cited paths are missing |
| `bash .cursor/skills/verify-merze-skills/scripts/launch.sh` | Isolated verify stack |
| `bash .cursor/skills/verify-merze-skills/scripts/doctor.sh` | Ready check |
| `bash .cursor/skills/verify-merze-skills/scripts/cleanup.sh` | Tear down verify stack |
| `docker build -f site/Dockerfile -t skills-merze-ai .` | Coolify-style image |

## Verify ports (isolated)

| Service | Port | URL |
| --- | --- | --- |
| UI | `4322` | http://localhost:4322 |

Do not attach a browser to a stack you did not launch. Default `npm run dev` uses Astro `4321` and is a different instance.

## Branching

- Default work branch. `develop`.
- Production. `main` via PR only. Manual merge for now.
- Feature branches. `agent/<ISSUE-ID>` off `develop` for the harness.
- Staging. Coolify `skills:develop` → `https://skills.dev.merze.ai` (when provisioned).
- Production Coolify. app `skills` uuid `voo7amqb3tnf6uavnitfpqyf` on `main` → `https://skills.merze.ai`.

## Safety rules for agents

- Never merge to `main` or deploy production.
- Never invent skills or weaken allowlist / scrub.
- Prefer the verify stack for UI proof.
- Health on deployed images. `GET /healthz` → `ok`.
- Edge rate limits (MER-1104). **nginx `limit_req`** for raw `/skill/<name>/` files, `*.zip` downloads, and discovery JSON lives in `site/nginx.conf` (`rl_raw` 30r/m burst 20, `rl_zip` 10r/m burst 6, `rl_discovery` 60r/m burst 30, `limit_req_status 429`). Thresholds documented in `docs/agent/system-map.md` step 5. Do not hammer `/skills.zip` in QA.
