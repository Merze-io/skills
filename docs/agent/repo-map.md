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
| `site/scripts/check-seo-http.mjs` | Bounded read-only HTTP discovery + origin/production-edge policy checks |
| `site/scripts/check-seo-http.test.mjs` | Dynamic-catalog HTTP fixtures and negative regression tests |
| `site/scripts/write-nginx-redirects.mjs` | Generate nginx maps and `site/scripts/redirect-cases.tsv` |
| `site/nginx.conf` | Origin routes, stable Markdown alternate, sitemap alias, rate limits |
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
| `npm run test-seo-http` | Node HTTP checker fixtures; includes old alternate bug and multi-skill inventory |
| `npm run check-seo-http -- --origin http://127.0.0.1:18080` | GET/HEAD discovery checks against a built nginx image |
| `npm run axe:viewports` | Axe at 320 / 360 / 1280 |

From repo root:

| Command | Purpose |
| --- | --- |
| `node scripts/check-agent-maps.mjs` | Fail if map-cited paths are missing |
| `bash .cursor/skills/verify-merze-skills/scripts/launch.sh` | Isolated verify stack |
| `bash .cursor/skills/verify-merze-skills/scripts/doctor.sh` | Ready check |
| `bash .cursor/skills/verify-merze-skills/scripts/cleanup.sh` | Tear down verify stack |
| `docker build -f site/Dockerfile -t skills-merze-ai .` | Coolify-style image |

## HTTP discovery verification

The checker uses Node 22 and no npm runtime dependencies. The transport origin can be local; published URLs default to `https://skills.merze.ai`. Override them with `--canonical-origin` only for a catalog that actually publishes another origin. Redirects are checked manually, never followed to arbitrary hosts. Cross-host robots/sitemap URLs fail before requests to them.

For an approved read-only production probe, use `npm run check-seo-http -- --origin https://skills.merze.ai --profile production-edge`. The plain `origin` profile does not require edge-managed training exclusions. No mode changes server policy. Bounds: 2 MiB per response, 10 seconds per request, 2,000 requests, 500 pages and 20 sitemap documents. Raw-file/subpage requests are serial and spaced by 2.1 seconds; 429 is a failure, not retried. Run against a fresh smoke container to avoid existing rate-test buckets.

When Docker is unavailable, native nginx can verify routing after `npm run build`. Create an isolated temporary wrapper with `events {}` and `http {}`. Include the native `mime.types`, then the contents of `site/nginx.conf` inside `http`. In that temporary copy only, replace `/etc/nginx/snippets/` includes with absolute paths to `site/nginx-security-headers.conf`, `site/nginx-dist-headers.conf`, and the redirects snippet that `npm run build` writes under the generated dist-nginx directory; replace the HTML root with the absolute path to the generated dist directory. Never cite build outputs as repo paths in this map: a fresh checkout has no dist or dist-nginx, and the map checker runs before any build. Bind only `127.0.0.1` on a free port. Put the PID, logs and temporary directories under the temporary prefix. Run `nginx -t -p <prefix> -c <config>`, start it, run the checker with that origin, and stop it with `nginx -s quit -p <prefix> -c <config>`. This supplements, but does not replace, the pinned Docker image smoke in CI. On a case-insensitive macOS volume, the existing `SKILL.MD` 404 matrix probe can return 200; use the Linux Docker image to verify case-sensitive raw-file behavior.

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
