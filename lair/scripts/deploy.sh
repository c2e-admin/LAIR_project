#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

BRANCH=${BRANCH:-main}

if [ -d .git ]; then
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
fi

docker compose -f docker-compose.prod.yml build
./scripts/migrate.sh

docker compose -f docker-compose.prod.yml up -d

sleep 5
echo "Health: $(curl -s http://localhost/healthz)"
echo "Services deployed on http://localhost"
