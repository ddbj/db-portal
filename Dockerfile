FROM node:24.15.0-bookworm AS base

LABEL org.opencontainers.image.title="db-portal" \
      org.opencontainers.image.description="DDBJ DB Portal - integrated web portal for DDBJ services" \
      org.opencontainers.image.authors="Bioinformatics and DDBJ Center" \
      org.opencontainers.image.url="https://github.com/ddbj/db-portal" \
      org.opencontainers.image.source="https://github.com/ddbj/db-portal" \
      org.opencontainers.image.licenses="Apache-2.0"

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl \
      git \
      jq \
      less \
      vim-tiny && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* .npmrc ./

# Full install (incl dev): the build stage needs @react-router/dev, and the
# runtime command runs validate:content through vite + tsx. Made world-writable
# so an arbitrary host UID can run `npm install` inside the dev container.
RUN if [ -f package-lock.json ]; then npm ci --include=dev; else npm install --include=dev; fi && \
    chmod -R a+rwX node_modules

# Writable HOME for arbitrary UID (containers may run as host UID:GID).
ENV HOME=/home/app
RUN mkdir -p /home/app && chmod 777 /home/app

# --- dev: source is bind-mounted at runtime (HMR / unit + pbt). ---
FROM base AS dev
COPY . .
CMD ["sleep", "infinity"]

# --- e2e: Playwright runner. Drives headless chromium against a DEPLOYED URL
#     (DB_PORTAL_PORTAL_ORIGIN) to verify it end-to-end. Built and run on the
#     staging host; carries chromium + devDeps + specs but builds no app — the
#     target under test is the already-deployed staging app reached over its
#     public origin, so the reverse proxy / TLS / Secure cookie / redirect_uri
#     path is exercised for real. Never point it at a local dev server. ---
FROM base AS e2e
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium && \
    chmod -R a+rX /ms-playwright
COPY . .
CMD ["npm", "run", "test:e2e"]

# --- build: produce the SSR/client build artifact. ---
FROM base AS build
# VITE_* vars are baked into the client bundle at build time, so they must be
# declared as ARGs here and passed via compose build.args (not runtime env).
ARG VITE_DB_PORTAL_SEARCH_API_URL
ARG VITE_DB_PORTAL_KEYCLOAK_REALM_URL
ARG VITE_DB_PORTAL_KEYCLOAK_CLIENT_ID
ARG VITE_DB_PORTAL_PORTAL_ORIGIN
ARG VITE_DB_PORTAL_DEFAULT_LANG=ja
COPY . .
RUN NODE_ENV=production npm run build

# --- runtime: immutable production image with build/ baked in, no Playwright. ---
FROM base AS runtime
# tsx (the runtime command) and friends resolve without the npm wrapper, which
# keeps node as PID 1's direct child so SIGTERM reaches it (npm does not forward).
ENV PATH="/app/node_modules/.bin:${PATH}"
COPY . .
COPY --from=build /app/build ./build
RUN chmod -R a+rX build
CMD ["tsx", "server/index.ts"]
