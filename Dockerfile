# ==============================================================================
# NEXA Mission Control - Unified All-in-One Production Dockerfile
# Serves both the Rust Axum API and the React SPA as a single container image.
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend (React + Vite + Tailwind)
# ------------------------------------------------------------------------------
FROM node:22-alpine AS client-builder

WORKDIR /app/client

RUN corepack enable && corepack prepare pnpm@11.17.0 --activate

COPY client/package.json client/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY client/ ./
RUN pnpm build

# ------------------------------------------------------------------------------
# Stage 2: Build Backend (Rust Axum + SQLite)
# ------------------------------------------------------------------------------
FROM rust:1-slim-bookworm AS server-builder

WORKDIR /app/server

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY server/Cargo.toml server/Cargo.lock ./
COPY server/migrations ./migrations
COPY server/src ./src

RUN cargo build --release --locked

# ------------------------------------------------------------------------------
# Stage 3: Unified Production Runtime Container
# ------------------------------------------------------------------------------
FROM debian:bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend binary and migrations
COPY --from=server-builder /app/server/target/release/mission-control-server /app/mission-control-server
COPY --from=server-builder /app/server/migrations /app/migrations

# Copy compiled frontend SPA
COPY --from=client-builder /app/client/dist /app/dist

# Create storage directories
RUN mkdir -p /data /uploads

# Default Environment Variables
ENV PORT=1337
ENV HOST=0.0.0.0
ENV DATABASE_URL=sqlite:///data/mission-control.db?mode=rwc
ENV UPLOAD_DIR=/uploads
ENV STATIC_DIR=/app/dist

# Expose single unified port (default 1337 matching Planka drop-in replacement)
EXPOSE 1337

VOLUME ["/data", "/uploads"]

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:1337/api/v1/health || exit 1

CMD ["/app/mission-control-server"]
