# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-bookworm AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune dev deps so only production modules are copied to runtime
RUN npm ci --omit=dev --prefer-offline

# ── Runtime stage — Debian Trixie slim ───────────────────────────────────────
FROM debian:trixie-slim

# libstdc++6 is required by the Node.js binary from bookworm
RUN apt-get update && \
    apt-get install -y --no-install-recommends libstdc++6 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Borrow the Node.js binary from the build stage (glibc-compatible with Trixie)
COPY --from=builder /usr/local/bin/node /usr/local/bin/node

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["node", "dist/index.js"]
