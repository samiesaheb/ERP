FROM rust:1.87-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY . .

ENV SQLX_OFFLINE=true
RUN cargo build --release --package skyhigh-api

FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/skyhigh-api .

EXPOSE 8080
CMD ["./skyhigh-api"]
