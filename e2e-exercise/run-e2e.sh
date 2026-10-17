#!/usr/bin/env bash

set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
app_dir="$(cd -- "$script_dir/../app" && pwd)"

cleanup() {
  local exit_code=$?
  trap - EXIT
  cd "$app_dir"
  docker compose --profile e2e down || true
  exit "$exit_code"
}

trap cleanup EXIT

cd "$app_dir"
docker compose up -d --force-recreate --wait db-e2e
npm run db:migrate:e2e-exercise
docker compose up -d --build --force-recreate --wait app

cd "$script_dir"
npm test
