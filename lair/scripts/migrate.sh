#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy
docker compose -f docker-compose.prod.yml run --rm backend node dist/seed.js || true
