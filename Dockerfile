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

# --- dev: source is bind-mounted at runtime (HMR); Playwright for e2e. ---
FROM base AS dev
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium && \
    chmod -R a+rX /ms-playwright
COPY . .
CMD ["sleep", "infinity"]

# --- build: produce the SSR/client build artifact. ---
FROM base AS build
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
