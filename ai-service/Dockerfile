# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-bookworm AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune dev deps so only production modules are copied to runtime
RUN npm install --omit=dev

# ── Runtime stage — Debian Trixie slim ───────────────────────────────────────
FROM debian:trixie-slim

# libstdc++6 is required by the Node.js binary from bookworm
# tesseract-ocr + poppler-utils enable OCR on image-based PDF pages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libstdc++6 ca-certificates \
      tesseract-ocr \
      poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Borrow the Node.js binary from the build stage (glibc-compatible with Trixie)
COPY --from=builder /usr/local/bin/node /usr/local/bin/node

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["node", "dist/index.js"]
