# Build context: repository root (skills + site/)
# Node is pinned (22) so zip/tar tooling stays reproducible. Discovery digests
# use zip only; do not publish tar.gz digests unless Node remains pinned.
FROM node:22-alpine AS build
WORKDIR /repo
COPY . .
WORKDIR /repo/site
# Per-skill updated_at: committed site/data/skill-dates.json only (CI fails if
# stale vs git). Archive entry mtimes are fixed (DOS 1980-01-01 / tar mtime 0).
ENV PUPPETEER_SKIP_DOWNLOAD=1
RUN npm ci && npm run build && npm run verify-dist

FROM nginxinc/nginx-unprivileged:1.27-alpine
USER root
RUN mkdir -p /etc/nginx/snippets
COPY site/nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY site/nginx-dist-headers.conf /etc/nginx/snippets/dist-headers.conf
COPY site/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/site/dist-nginx/skills-redirects.conf /etc/nginx/snippets/skills-redirects.conf
COPY --from=build /repo/site/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
