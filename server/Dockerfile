# Stage 1: Build binary
FROM rust:1-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
COPY migrations ./migrations
COPY src ./src

RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates libssl3 sqlite3 curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/taskflow-server /app/taskflow-server
COPY --from=builder /app/migrations /app/migrations

ENV PORT=8000
ENV DATABASE_URL=sqlite:///data/taskflow.db?mode=rwc
ENV UPLOAD_DIR=/uploads

EXPOSE 8000

CMD ["/app/taskflow-server"]
