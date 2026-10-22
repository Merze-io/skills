# Build context: repository root (skills + site/)
FROM node:22-alpine AS build
WORKDIR /repo
COPY . .
WORKDIR /repo/site
# Coolify build-time vars are COOLIFY_* and (optionally) SOURCE_COMMIT — not
# SOURCE_DATE / SOURCE_COMMIT_DATE. .dockerignore excludes .git, so skill
# updated_at falls back to SOURCE_DATE_EPOCH / SOURCE_DATE if you set them as
# Coolify build args, else HEAD (when git exists), else 1980-01-01T00:00:00.000Z.
ARG SOURCE_COMMIT=
ARG SOURCE_DATE=
ARG SOURCE_COMMIT_DATE=
ARG SOURCE_DATE_EPOCH=
ENV SOURCE_COMMIT=$SOURCE_COMMIT \
    SOURCE_DATE=$SOURCE_DATE \
    SOURCE_COMMIT_DATE=$SOURCE_COMMIT_DATE \
    SOURCE_DATE_EPOCH=$SOURCE_DATE_EPOCH \
    PUPPETEER_SKIP_DOWNLOAD=1
RUN npm ci && npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
USER root
RUN mkdir -p /etc/nginx/snippets
COPY site/nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY site/nginx-dist-headers.conf /etc/nginx/snippets/dist-headers.conf
COPY site/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/site/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
