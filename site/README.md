# skills.merze.ai

Static catalog site for [Merze-io/skills](https://github.com/Merze-io/skills).

## Develop

```bash
cd site
npm ci
npm run dev
```

## Build

```bash
npm run build
```

Optional env for “last updated” (Coolify build args):

- `SOURCE_DATE` or `SOURCE_COMMIT_DATE` — ISO date string
- `SOURCE_COMMIT` — commit SHA (informational)

If unset, the updated field and sort-by-updated are omitted.

## Docker

From the **repository root**:

```bash
docker build -f site/Dockerfile -t skills-merze-ai .
docker run --rm -p 8080:8080 skills-merze-ai
```

Health check: `GET /healthz` → `ok`
