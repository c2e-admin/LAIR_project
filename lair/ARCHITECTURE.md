# LAIR System Architecture

## Stack Overview
- **Backend API**: Node.js 18 + Express + Prisma ORM (PostgreSQL). JSON logs with request-id middleware. CSRF + cookie sessions for admin. Rate limiting via express-rate-limit and Redis-ready config (Redis optional in compose).
- **Bot Service**: Node.js 18 + Telegraf. Communicates with backend via bot service token. Handles client/admin flows defined in spec (Ukrainian copy).
- **Web Frontend**: Static SPA pages served via nginx. Public calculator (Tailwind CDN). Admin panel (vanilla JS + fetch) using cookie auth + CSRF.
- **Database**: PostgreSQL 15. Prisma migrations + seed script for pricing, loyalty tiers, admin bootstrap.
- **Reverse Proxy**: nginx terminating TLS (self-signed in dev). Routes /api/* to backend, /bot webhook (optional), serves /app static.
- **Containers**: backend, bot, web (static build), postgres, redis, nginx.

## Key Flows
### Client (Telegram)
1. `/start` -> backend verifies/creates user, requests phone via contact share button.
2. Main menu buttons: orders, balance, loyalty, referrals, topup, support.
3. Manual topup: backend creates `topup_request` with `LAIRTOPUP-<id>`; bot collects evidence file_id.
4. Online payment: bot creates PaymentIntent via `/api/bot/payments/intent`, opens provider link (stub/sandbox). Webhook updates status -> balance.
5. Orders listing + cancellation (if status CREATED/PENDING and no delivery). Support ticket creates backend record (stub endpoint provided).

### Admin Panel
- Login (`/api/auth/login`) -> httpOnly cookies + CSRF token returned. Refresh via `/api/auth/refresh`.
- Orders: list/filter, update status (ADMIN), comments (ADMIN/MANAGER), audit trail logging.
- Pricing/discounts/loyalty: CRUD endpoints update DB and emit audit logs.
- Manual topups: queue approve/reject with audit logging.
- Balance adjustments and loyalty overrides restricted to ADMIN.

### Pricing Calculation
- Public endpoint `/api/public/pricing/estimate` computes subtotal from `pricing_devices` (hourly/daily). Applies discounts in order: bundle -> loyalty -> referral (capped by `MAX_DISCOUNT_PERCENT`). Minimum 3h for hourly enforced. Real-time updates used by calculator.

### Discount Logic
1. **Bundle**: if total item qty >= rule.min_total_qty and active -> percent discount on subtotal.
2. **Loyalty**: based on user.tier percent.
3. **Referral**: applies configured percent (placeholder) respecting MAX_DISCOUNT_PERCENT (stored in config table via `discount_bundle_rules` or env; stored in `referral_config` seed table inside Prisma schema via `config` model).

### Security
- Rate limiting on public endpoints (30/min estimate, 10/min order create).
- CSRF protection for admin state changes (require `X-CSRF-Token`).
- Sessions stored in signed cookies (short access + refresh). Password auth with bcrypt hash stored in env for bootstrap admin.
- Telegram bot identity validated via shared HMAC (bot token shared secret); bot sends signature header `x-bot-signature`.
- Audit logs for all admin mutations.

### Deploy
- `scripts/deploy.sh`: pull latest, build images, run migrations, restart via docker-compose.prod.yml, health check `/healthz`.
- `scripts/migrate.sh`: run Prisma migrate deploy and seed.
- Backups: `scripts/backup_db.sh` (pg_dump) and `scripts/restore_db.sh` (pg_restore).

## Directory Map (key)
- `backend/` Express API + Prisma.
- `bot/` Telegraf bot.
- `web/` static SPA (public calculator) + admin panel.
- `nginx/` reverse proxy config.
- `infra/` env templates and compose files.
- `scripts/` deploy/ops scripts.

