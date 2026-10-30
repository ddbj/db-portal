FROM node:26-trixie-slim AS base

LABEL org.opencontainers.image.title="db-portal" \
      org.opencontainers.image.description="DDBJ DB Portal - integrated web portal for DDBJ services" \
      org.opencontainers.image.authors="Bioinformatics and DDBJ Center" \
      org.opencontainers.image.url="https://github.com/ddbj/db-portal" \
      org.opencontainers.image.source="https://github.com/ddbj/db-portal" \
      org.opencontainers.image.licenses="Apache-2.0"

# git は build stage の gen-last-updated と runtime の news mirror が使う。
# slim image は ca-certificates を持たないので、 git が https の repo を
# clone できるように明示して入れる。
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Writable HOME for arbitrary UID (containers may run as host UID:GID).
ENV HOME=/home/app
RUN mkdir -p /home/app && chmod 777 /home/app

# --- deps: full install (incl dev) shared by dev / e2e / build. Made
#     world-writable so an arbitrary host UID can run `npm install` inside the
#     dev container. ---
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci --include=dev && \
    chmod -R a+rwX node_modules

# --- prod-deps: the packages that build/server and build/bff import at
#     runtime. ---
FROM base AS prod-deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

# --- dev: source is bind-mounted at runtime (HMR / unit + pbt). ---
FROM deps AS dev
COPY . .
CMD ["sleep", "infinity"]

# --- e2e: Playwright runner. Drives headless chromium against a DEPLOYED URL
#     (DB_PORTAL_PORTAL_ORIGIN) to verify it end-to-end. Built and run on the
#     staging host; carries chromium + devDeps + specs but builds no app — the
#     target under test is the already-deployed staging app reached over its
#     public origin, so the reverse proxy / TLS / Secure cookie / redirect_uri
#     path is exercised for real. Never point it at a local dev server. ---
FROM deps AS e2e
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium && \
    chmod -R a+rX /ms-playwright
COPY . .
CMD ["npm", "run", "test:e2e"]

# --- build: produce the SSR/client build and the server bundle. ---
FROM deps AS build
# VITE_* vars are baked into the client bundle at build time, so they must be
# declared as ARGs here and passed via compose build.args (not runtime env).
ARG VITE_DB_PORTAL_SEARCH_API_URL
ARG VITE_DB_PORTAL_KEYCLOAK_REALM_URL
ARG VITE_DB_PORTAL_KEYCLOAK_CLIENT_ID
ARG VITE_DB_PORTAL_PORTAL_ORIGIN
ARG VITE_DB_PORTAL_DEFAULT_LANG=ja
COPY . .
RUN NODE_ENV=production npm run build

# --- runtime: immutable production image with the build output and
#     production dependencies only. ---
FROM base AS runtime
# The runtime command starts node directly, so npm and npx are not needed.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
# package.json declares "type": "module" for build/bff/index.js.
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
# page-contents/ は express.static が画像 asset を serve し、 sitemap.xml が
# page の一覧を読むのに使う。 last-updated.json は sitemap.xml の lastmod に使う。
COPY --from=build /app/page-contents ./page-contents
COPY --from=build /app/app/lib/content/gen/last-updated.json ./app/lib/content/gen/last-updated.json
RUN chmod -R a+rX build page-contents app
CMD ["node", "build/bff/index.js"]
