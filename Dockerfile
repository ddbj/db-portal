FROM node:24.13.0-bookworm

LABEL org.opencontainers.image.title="db-portal" \
      org.opencontainers.image.description="DDBJ DB Portal - integrated web portal for DDBJ services" \
      org.opencontainers.image.authors="Bioinformatics and DDBJ Center" \
      org.opencontainers.image.url="https://github.com/ddbj/db-portal" \
      org.opencontainers.image.source="https://github.com/ddbj/db-portal" \
      org.opencontainers.image.licenses="Apache-2.0"

RUN apt update && \
    apt install -y --no-install-recommends \
    curl \
    jq \
    less \
    vim-tiny && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

# chmod: named volume inherits image permissions on first creation;
#        make writable so arbitrary UID (dev) can run `npm install`.
RUN npm ci && \
    chmod -R a+rwX node_modules

COPY . .

# Writable home for arbitrary UID (dev containers use user: UID:GID).
ENV HOME=/home/app
RUN mkdir -p /home/app && chmod 777 /home/app

CMD ["sleep", "infinity"]
