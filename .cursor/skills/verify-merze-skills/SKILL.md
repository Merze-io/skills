---
name: verify-merze-skills
description: >-
  Drive the Merze Skills catalog (skills.merze.ai) in a browser and prove what a
  visitor sees. Use when changing catalog home, skill detail, filters, search, or
  install UI in Merze-io/skills.
---

# Verify Merze Skills

The surface is the public skills catalog. A visitor browses or searches skills, opens a detail page, and downloads or installs allowlisted skill files. There is no Stripe, Appwrite, or chat API.

Launch uses isolated port `4322` and refuses to start when that port is taken. Do not attach the browser to a catalog you did not start for this run. Default `npm run dev` uses Astro `4321` and must not be confused with this verification instance.

Do not merge to `main`, deploy production Coolify, or invent catalog skills. The safe automated proof is the catalog home plus the `us-llc-state-cost` skill detail page.

## Launch

From the repo root (`skills`), with Node 22:

```bash
bash .cursor/skills/verify-merze-skills/scripts/launch.sh
```

Ready when the script prints `ready ui=http://localhost:4322`. Prefer `http://localhost:4322` over `http://127.0.0.1:4322`.

The script records the process-group leader in `.cursor/skills/verify-merze-skills/run/pid`, the port in `run/ui-port`, and the log in `run/dev.log`. Those files are scratch.

Teardown is `bash .cursor/skills/verify-merze-skills/scripts/cleanup.sh`.

## Doctor

```bash
bash .cursor/skills/verify-merze-skills/scripts/doctor.sh
```

It passes only when all of these are true:

- `run/pid` is alive and its process group owns the UI listener
- `GET http://localhost:4322/` contains `Merze Skills`
- a process in that group is Node 22 when available at `/usr/local/opt/node@22`

A failing doctor means do not drive.

## Drive

Use the Cursor browser tools. Start at `http://localhost:4322/`. Lock the tab before interacting, and unlock when finished.

Prefer accessible names from a fresh `browser_snapshot`. Refs go stale after each snapshot.

Minimum proof for UI tickets:

1. Catalog home shows the Merze Skills hero.
2. Open `/skill/us-llc-state-cost` and confirm the skill title and install surfaces.

Save screenshots under `.cursor/skills/verify-merze-skills/artifacts/` when the ticket asks for visual proof.
