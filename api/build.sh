#!/bin/bash
set -e
export SQLX_OFFLINE=true
cargo build --release --package skyhigh-api
