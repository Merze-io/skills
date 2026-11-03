# Specification: MER-1104 — edge rate limiting for raw files, zips, and discovery JSON on skills.merze.ai

## Goal

Add explicit request rate limiting at the edge (in front of the Coolify `skills` app) for three endpoint groups on skills.merze.ai:

1. **Raw skill files** under `/skill/<name>/` (the served markdown/txt/json/yaml/csv files, nginx location `~ ^/skill/[a-z0-9-]+/.`).
2. **Zip downloads** under `/skill/<name>/` — nginx location `~ ^/(?:skill/[a-z0-9-]+|skills)\.zip$` (this single location block also serves the repo-wide `/skills.zip`; limiting the block covers both).
3. **Discovery JSON** — `/skills.json`, `/.well-known/agent-skills/index.json`, `/skill/<name>.json`, `/skill/<name>/.well-known/agent-skills/index.json`. (The `schemas/*.json` URIs share the same nginx location block but are NOT discovery JSON and must NOT be throttled — see the `map` decision below.)

**Chosen mechanism: nginx `limit_req`** in the committed `site/nginx.conf` (the container nginx that the Coolify image runs). Rationale: it is one of the two mechanisms the issue names, it lives in committed code so thresholds are grep-able and reviewable, and the image (`nginxinc/nginx-unprivileged:1.27-alpine`) ships both `ngx_http_limit_req_module` and `ngx_http_realip_module`. Do **not** add Cloudflare configuration.

The image serves static files directly from nginx; there is no upstream app process, so "throttled before reaching the Coolify app" == "throttled in the first nginx" — a 429 must never be possible to bypass by hitting the container. Because the container sits behind Coolify's proxy, configure realip so per-client keying works:

- In the `server` block: `set_real_ip_from 10.0.0.0/8;`, `set_real_ip_from 172.16.0.0/12;`, `set_real_ip_from 192.168.0.0/16;`, `set_real_ip_from 127.0.0.1;` and `real_ip_header X-Forwarded-For;` (private ranges only — Coolify proxy/Traefik is on the same private network).
- Zone key: `$binary_remote_addr` (post-realip client IP). This is IP-based edge throttling only — no per-user/API-key/tenant concepts.

At the top of `site/nginx.conf` (conf.d is included in the `http` context, so `limit_req_zone` and `map` belong there, outside `server`), add:

```nginx
# MER-1104 edge rate limiting (nginx limit_req). Thresholds below are the
# reviewed defaults; adjust the rate= values here only, document in
# docs/agent/system-map.md step 5.
#   group     rate   burst  window   (nodelay)
#   raw       30r/m  20     60s      allows one normal install's file burst
#   zip       10r/m  6      60s      occasional archive download + retries
#   discovery 60r/m  30     60s      small JSON, startup polling tolerated
map $uri $discovery_key {
    ~^/skills\.json$                                              $binary_remote_addr;
    ~^/\.well-known/agent-skills/index\.json$                     $binary_remote_addr;
    ~^/skill/[a-z0-9-]+\.json$                                    $binary_remote_addr;
    ~^/skill/[a-z0-9-]+/\.well-known/agent-skills/index\.json$    $binary_remote_addr;
    default "";                                                   # empty key = not counted (schemas/*.json stay unlimited)
}
limit_req_zone $binary_remote_addr zone=rl_raw:10m       rate=30r/m;
limit_req_zone $discovery_key      zone=rl_discovery:10m rate=60r/m;
limit_req_zone $binary_remote_addr zone=rl_zip:10m       rate=10r/m;
limit_req_status 429;
```

Then inside the existing location blocks (do not move or rewrite the location matching or `try_files`):

- raw files location `~ ^/skill/[a-z0-9-]+/.`: `limit_req zone=rl_raw burst=20 nodelay;`
- zip location `~ ^/(?:skill/[a-z0-9-]+|skills)\.zip$`: `limit_req zone=rl_zip burst=6 nodelay;`
- discovery/JSON location `~ ^/(?:\.well-known/agent-skills/index\.json|skills\.json|...)$`: `limit_req zone=rl_discovery burst=30 nodelay;`

`limit_req_status 429` may live at `http` level (affects only these locations — no other status is emitted by these zones). The `429` response must NOT include the `dist-headers`/`security-headers` `add_header` lines as if it were a normal response — nginx applies `add_header` on 429 by default for `always`-flagged headers, which is fine; do not disable or alter the error body handling beyond what nginx provides.

Record the chosen mechanism + threshold table as comments in `site/nginx.conf` (above) **and** as a short "Edge rate limits (MER-1104)" note under step 5 (Deploy) in `docs/agent/system-map.md`, so the values are locatable by grep of committed config (AC1/AC2).

Precondition: this work is explicitly scoped to land after the PR-1→PR-4 series on skills; those merges (MER-1099/1100/1101/1106 landings, PRs #13–#19) are already in the base branch. Work on feature branch `agent/MER-1104` off `develop`; agents merge only to `develop`, never `main`.

## Non-goals

- Per-user, per-API-key, per-tenant quotas or auth-based throttling.
- Rate limiting anything else: HTML pages (`/skill/<name>`, `/`, `/about`), `/llms*.txt`, `/install.md`, `pagefind`, `/_astro`, `tar.gz` archives, and `schemas/*.son` JSON are all left unlimited. (`/skill/<name>.tar.gz` is excluded: the issue says "zips"; the tar.gz location is a separate nginx location — leave it untouched.)
- General WAF, bot management, or DDoS protection.
- Any caching, CDN, payload, header, or content change on the limited endpoints: below-threshold responses must be byte-identical to before the change (same status, same body, same headers that pre-existed).
- Cloudflare configuration of any kind.
- Deploying to production Coolify (humans promote `develop` → `main`).

## Files

- `site/nginx.conf` — zones, map, `limit_req_status`, `limit_req` directives, realip, threshold comments (DO NOT touch `site/scripts/write-nginx-redirects.mjs`, `skill-sources.mjs`, or the redirect settings).
- `docs/agent/system-map.md` — deploy step note with the mechanism + threshold table.
- `docs/agent/repo-map.md` — one line under Commands/Safety pointing at the rate-limit config.
- `.github/workflows/site.yml` — extend the existing docker-smoke `cid` block (port `18080`) with the local 429 verification job steps described under Checks.

## Acceptance criteria

- [ ] AC1: A grep of the committed repo (e.g. `grep -rn "limit_req" site/nginx.conf docs/agent/`) locates the rate-limiting configuration covering all three groups (raw, zip, discovery), in `site/nginx.conf` plus the maps note.
- [ ] AC2: Explicit threshold and window values are recorded for each of the three groups (the table in `site/nginx.conf` comments and the `docs/agent/system-map.md` note), and the record names **nginx limit_req** as the chosen mechanism explicitly.
- [ ] AC3: `limit_req zone=rl_raw burst=20 nodelay;` covers the raw-file endpoint: a real `curl` loop against the deployed URL exceeding rate+burst (e.g. 45 rapid requests to `/skill/us-llc-state-cost/SKILL.md`) yields HTTP 429 responses whose output is captured in the QA record.
- [ ] AC4: `limit_req zone=rl_zip burst=6 nodelay;` covers the zip endpoint: a deployed-URL loop exceeding rate+burst (e.g. 25 rapid requests to `/skill/us-llc-state-cost.zip`) yields HTTP 429 responses, captured in the QA record.
- [ ] AC5: `limit_req zone=rl_discovery burst=30 nodelay;` covers the discovery JSON: a deployed-URL loop exceeding rate+burst (e.g. 95 rapid requests to `/skills.json` and/or `/.well-known/agent-skills/index.json`) yields HTTP 429 responses, captured in the QA record.
- [ ] AC6: Sub-threshold requests return unchanged responses: for each group, curl output showing HTTP 200 with byte-identical body + pre-existing headers is captured in the QA record (compare `curl -fsS` body of a fresh allowed request against the pre-change body captured from `https://skills.merze.ai` before promotion, or against the main image before this branch as fallback; the `/healthz`, HTML, tar.gz, and `schemas/*.json` responses on the deployed host are unchanged by this work).
- [ ] AC7: Local docker-smoke proof in CI: the extended `.github/workflows/site.yml` block generates ≥50 429s in a loop against a freshly-started local container for each of the three groups, using a distinct `X-Forwarded-For` breadcrumb per request (each distinct loop IP, e.g. `10.201.0.1`…`10.201.0.55`, gets its own bucket so the smoke is deterministic regardless of which earlier CI curl used the loopback IP; this overflow-profile is exercised because realip honors XFF from `127.0.0.1`).
- [ ] AC8: Required checks pass: `npm ci`, `npm run build`, `npm run check-skill-dates`, `npm run check-redirect-cases`, `npm run verify-dist` in `site/`; `node scripts/check-agent-maps.mjs` from the repo root; `docker build -f site/Dockerfile -t skills-merze-ai:local .` succeeds (or the CI docker smoke passes on its own if local Docker is unavailable).
- [ ] AC9: grep of the committed, non-generated code shows no payload change to the endpoints: `site/nginx.conf` still contains the exact same `try_files` lines, `Content-Disposition` attachment headers, `types{}` blocks, `gzip off`, dist-headers includes, etc. — only the listed `limit_req`, realip, `map`, `zone` and `limit_req_status` lines are added; `git diff --stat` shows the diff touches only the four Files above; `git diff` of nginx.conf contains no `return` rewrites of 200/301 paths and no new `proxy_pass`.

## Checks

From `site/`:

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
docker build -f site/Dockerfile -t skills-merze-ai:local .
docker run -d --rm -p 18080:8080 --name mer-1104-smoke skills-merze-ai:local
sleep 3
for i in $(seq 1 50); do curl -s -o /dev/null -w '%{http_code} ' -H "X-Forwarded-For: 10.201.0.2, $i" http://127.0.0.1:18080/skill/us-llc-state-cost/SKILL.md; done | tr ' ' '\n' | sort | uniq -c   # → 21× 200, ≥29× 429
for i in $(seq 1 20); do curl -s -o /dev/null -w '%{http_code} ' -H "X-Forwarded-For: 10.202.0.2, $i" http://127.0.0.1:18080/skill/us-llc-state-cost.zip;        done | tr ' ' '\n' | sort | uniq -c   # → 7× 200, ≥13× 429
for i in $(seq 1 100); do curl -s -o /dev/null -w '%{http_code} ' -H "X-Forwarded-For: 10.203.0.2, $i" http://127.0.0.1:18080/skills.json;                       done | tr ' ' '\n' | sort | uniq -c   # → 31× 200, ≥69× 429
curl -fsS http://127.0.0.1:18080/healthz | grep -q ok
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' http://127.0.0.1:18080/schemas/skills-manifest.schema.json 2>/dev/null | head -1   # must NOT be 429 (schemas excluded)
docker stop mer-1104-smoke
```

CI note: in `.github/workflows/site.yml`, add the same `for`-loops inside the existing `$cid` (port `18080`) smoke block **before** the redirect-matrix step (so the loopback bucket is fresh), asserting `awk`-style that at least one `429` occurs in each loop and that the first request of each fresh-IP loop is `200`. Also assert one `curl http://127.0.0.1:18080/schemas/...json` is NOT `429`. These CI lines must run non-interactively and fail the workflow on unexpected output.

## QA script

Run against the deployed URL after the branch lands on `develop` and the Coolify staging app rebuilds (`https://skills.dev.merze.ai`), and repeat verbatim against `https://skills.merze.ai` after humans promote `develop` → `main` (full-URL QA needed to satisfy AC3–AC6 as written; do not run the hammer loops against prod more than twice).

Capture all output in the QA record under `runs-artifacts/MER-1104/qa.md`:

```bash
# Discovery JSON
for i in $(seq 1 95); do curl -s -o /dev/null -w '%{http_code} ' "$BASE/skills.json"; done
# raw file
for i in $(seq 1 45); do curl -s -o /dev/null -w '%{http_code} ' "$BASE/skill/us-llc-state-cost/SKILL.md"; done
# zip
for i in $(seq 1 25); do curl -s -o /dev/null -w '%{http_code} ' "$BASE/skill/us-llc-state-cost.zip"; done
```

Each of these three loops must print at least one `429` (AC3/AC4/AC5 provides the required proof). Then, after waiting >60s (past the window), confirm AC6 — sub-threshold responses are unchanged:

```bash
curl -s "$BASE/skills.json" | sha256sum          # must match the pre-change hash of https://skills.merze.ai/skills.json
curl -s "$BASE/skill/us-llc-state-cost/SKILL.md" > /tmp/skill.md && diff /tmp/skill.md <(git show main:us-llc-state-cost/SKILL.md 2>/dev/null || curl -s https://skills.merze.ai/skill/us-llc-state-cost/SKILL.md) || true
curl -sI "$BASE/skills.json" | head -1           # HTTP/2 200 before the loop, 200 after cooldown
```

Below-threshold means: after any cooldown the first single request must be `200` (not delayed >2s by `nodelay`), with the same body hash as pre-change. Save every loop's output to `runs-artifacts/MER-1104/qa.md` (this is the record that satisfies AC3–AC6). Do not run against prod more than the two loops needed, and never run a sustained loop on `/skills.zip` (it is large).