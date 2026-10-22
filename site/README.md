# skills.merze.ai

Static catalog site for Merze public Agent Skills.

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

Publishes allowlisted skill files to `dist/files/<slug>/` via
`src/lib/skill-sources.mjs` (md/txt/json/yaml/yml/csv only; no symlinks).
`scripts/scrub-github.mjs` is the single “github” substring gate — see DESIGN.md.

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

## nginx notes

- Security headers live in `nginx-security-headers.conf` and are `include`d in every
  `location` (so `add_header Cache-Control` does not drop CSP/nosniff/etc.).
- CSP includes `'wasm-unsafe-eval'` for Pagefind WASM.
- `/files/` uses a locked-down CSP (`default-src 'none'; sandbox`), `text/plain`, and `nosniff`.
- `absolute_redirect off` avoids `http://host:8080/...` redirects behind Coolify.
- This image has **gzip only** (no brotli module in `nginx-unprivileged`).
