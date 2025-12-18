#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
FILE=$1
if [ -z "$FILE" ]; then
  echo "Usage: restore_db.sh <dumpfile>"
  exit 1
fi
docker compose -f docker-compose.prod.yml exec -T postgres psql -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-lair} < "$FILE"
