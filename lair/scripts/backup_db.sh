#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-lair} > backups/lair-$TIMESTAMP.sql
