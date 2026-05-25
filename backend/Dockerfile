# ── Build stage ──────────────────────────────────────────────────────────────
FROM golang:1.23-bookworm AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd/server

# ── Runtime stage — Debian Trixie slim ───────────────────────────────────────
FROM debian:trixie-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates tzdata && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/server .

RUN mkdir -p /app/uploads

EXPOSE 8080

CMD ["/app/server"]
