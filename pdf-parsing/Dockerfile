FROM rust:1.88-slim AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y qpdf ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/pdf-parsing /usr/local/bin/pdf-parsing

ENV PORT=8080
EXPOSE 8080

CMD ["pdf-parsing"]
