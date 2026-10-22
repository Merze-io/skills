# Build context: repository root (skills + site/)
FROM node:22-alpine AS build
WORKDIR /repo
COPY . .
WORKDIR /repo/site
# Coolify typically passes SOURCE_DATE / SOURCE_COMMIT_DATE; SOURCE_DATE_EPOCH
# is the portable fallback when .git is absent (.dockerignore). Required for
# skills.json updated_at — build fails if none are set and git is unavailable.
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
