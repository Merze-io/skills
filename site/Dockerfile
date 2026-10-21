# Build context: repository root (skills + site/)
FROM node:22-alpine AS build
WORKDIR /repo
COPY . .
WORKDIR /repo/site
# Optional Coolify build args for "last updated" (omit field when unset)
ARG SOURCE_COMMIT=
ARG SOURCE_DATE=
ARG SOURCE_COMMIT_DATE=
ENV SOURCE_COMMIT=$SOURCE_COMMIT \
    SOURCE_DATE=$SOURCE_DATE \
    SOURCE_COMMIT_DATE=$SOURCE_COMMIT_DATE
RUN npm ci && npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
USER root
RUN mkdir -p /etc/nginx/snippets
COPY site/nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY site/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/site/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
