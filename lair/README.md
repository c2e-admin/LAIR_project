# LAIR (Gaming Rental) Monorepo

## Structure
- `backend/` – Express + Prisma API with migrations and seed.
- `bot/` – Telegram bot (Telegraf) using backend bot endpoints.
- `web/` – Public calculator SPA (`public/`) and admin panel (`admin/`).
- `nginx/` – reverse proxy configs for dev/prod.
- `scripts/` – deploy, migrate, backup helpers.
- `docker-compose.dev.yml` / `docker-compose.prod.yml` – stacks for dev/prod.

## Local Development
```bash
cd lair
cp .env.example .env
# install deps
(cd backend && npm install)
(cd bot && npm install)
# start stack
docker compose -f docker-compose.dev.yml up --build
```
Services:
- Backend: http://localhost:3000 (healthz)
- Web: http://localhost:8080 (calculator), admin at /admin/
- Postgres exposed on 5432.

Run Prisma migrate + seed locally:
```bash
cd backend
npx prisma migrate dev --name init
npm run seed
```

## Production Deploy
```bash
cd lair
./scripts/deploy.sh
```
Script pulls latest main, builds images, runs migrations, restarts compose and prints health.

## Backups
```bash
./scripts/backup_db.sh
# to restore
./scripts/restore_db.sh backups/<dumpfile>.sql
```

## Bot
Env required: `BOT_TOKEN`, `BOT_SERVICE_TOKEN`, `BACKEND_URL`. Bot exposes `/start` onboarding and `/balance` command.

## Notes
- Admin login uses `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` (bcrypt). CSRF token returned on login; include `X-CSRF-Token` on admin requests.
- Seed sets placeholder pricing, loyalty tiers, MAX_DISCOUNT_PERCENT config.
