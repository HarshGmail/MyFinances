# cargo-chef pre-built image: rust:1.88-slim + cargo-chef already installed
FROM lukemathwalker/cargo-chef:latest-rust-1.88-slim AS chef

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Planner: compute the dependency recipe from Cargo.toml/Cargo.lock ──
FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# ── Builder: compile deps (cached), then compile only your code ──
FROM chef AS builder

# This layer is ONLY invalidated when Cargo.toml or Cargo.lock changes.
# A pure src/ code change skips this entirely and reuses the cached layer.
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json

# Incremental build: only changed .rs files are recompiled here
COPY . .
RUN cargo build --release

# ── Runtime: tiny final image ──
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y qpdf ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/pdf-parsing /usr/local/bin/pdf-parsing

ENV PORT=8080
EXPOSE 8080

CMD ["pdf-parsing"]
