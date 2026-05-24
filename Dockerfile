FROM node:24.15.0-bookworm

LABEL org.opencontainers.image.title="db-portal" \
      org.opencontainers.image.description="DDBJ DB Portal - integrated web portal for DDBJ services" \
      org.opencontainers.image.authors="Bioinformatics and DDBJ Center" \
      org.opencontainers.image.url="https://github.com/ddbj/db-portal" \
      org.opencontainers.image.source="https://github.com/ddbj/db-portal" \
      org.opencontainers.image.licenses="Apache-2.0"

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl \
      jq \
      less \
      vim-tiny && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* .npmrc ./

# Named volume inherits image permissions on first creation; make node_modules
# writable so arbitrary UID can run `npm install` inside the dev container.
RUN if [ -f package-lock.json ]; then npm ci --include=dev; else npm install --include=dev; fi && \
    chmod -R a+rwX node_modules

COPY . .

# Writable HOME for arbitrary UID (dev containers run as host UID:GID).
ENV HOME=/home/app
RUN mkdir -p /home/app && chmod 777 /home/app

CMD ["sleep", "infinity"]
