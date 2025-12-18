import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import csrf from 'csurf';
import { prisma } from './prisma.js';
import { env } from './env.js';
import { compareSync } from 'bcryptjs';
import { randomUUID } from 'crypto';

const app = express();

const csrfProtection = csrf({ cookie: true });

app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json());
app.use(cookieParser(env.sessionSecret));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4173'],
    credentials: true,
  })
);

app.use((req, res, next) => {
  (req as any).requestId = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', (req as any).requestId as string);
  next();
});

app.use('/api', rateLimit({ windowMs: 60_000, max: 120 }));

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/readyz', (_req, res) => res.json({ status: 'ready' }));

// Public pricing estimate
app.post('/api/public/pricing/estimate', async (req, res) => {
  const { rental_type, items, duration_hours, duration_days } = req.body || {};
  if (!rental_type || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const devices = await prisma.pricing_devices.findMany({ where: { is_active: true } });
  const priceMap = new Map(devices.map((d) => [d.device_type, d]));
  let subtotal = 0;
  let totalQty = 0;
  for (const item of items) {
    const cfg = priceMap.get(item.device_type);
    if (!cfg) continue;
    const qty = Number(item.qty || 0);
    totalQty += qty;
    const unitPrice = rental_type === 'HOURLY' ? Number(cfg.hourly_price_uah) : Number(cfg.daily_price_uah);
    const duration = rental_type === 'HOURLY' ? Math.max(Number(duration_hours || 0), 3) : Math.max(Number(duration_days || 1), 1);
    subtotal += unitPrice * qty * duration;
  }
  let discountBundle = 0;
  const bundleRules = await prisma.discount_bundle_rules.findMany({ where: { is_active: true } });
  for (const rule of bundleRules) {
    if (rule.min_total_qty && totalQty >= rule.min_total_qty) {
      discountBundle = Math.max(discountBundle, Math.floor((subtotal * rule.percent) / 100));
    }
  }
  const discountLoyalty = 0; // loyalty evaluated server-side for known users
  const discountReferral = 0; // referral placeholder for public
  const total = subtotal - discountBundle - discountLoyalty - discountReferral;
  return res.json({ subtotal, discount_bundle: discountBundle, discount_loyalty: discountLoyalty, discount_referral: discountReferral, total });
});

// Public order creation (simplified)
app.post('/api/public/orders', async (req, res) => {
  const idem = req.header('Idempotency-Key');
  if (!idem) return res.status(400).json({ error: 'Idempotency-Key required' });
  const { client_name, client_phone, rental_type, items, start_datetime, duration_hours, duration_days } = req.body || {};
  if (!client_name || !client_phone || !rental_type || !Array.isArray(items)) return res.status(400).json({ error: 'Missing fields' });
  const existing = await prisma.audit_logs.findFirst({ where: { action_type: 'PUBLIC_ORDER', entity_id: idem } });
  if (existing) return res.json({ status: 'duplicate' });
  const order = await prisma.orders.create({
    data: {
      client_name,
      client_phone,
      rental_type,
      start_datetime: new Date(start_datetime),
      duration_hours: duration_hours ?? null,
      duration_days: duration_days ?? null,
      subtotal_uah: 0,
      total_uah: 0,
      items: { create: items.map((i: any) => ({ device_type: i.device_type, qty: i.qty, unit_price_uah: 0, subtotal_uah: 0 })) },
    },
  });
  await prisma.audit_logs.create({ data: { action_type: 'PUBLIC_ORDER', entity_type: 'order', entity_id: idem, before: null, after: order } });
  res.json({ id: order.id, status: order.status });
});

// Simple admin auth using password hash
function requireAuth(req: any, res: any, next: any) {
  if (req.cookies && req.cookies.access === 'ok') return next();
  return res.status(401).json({ error: 'unauthorized' });
}

app.post('/api/auth/login', csrfProtection, async (req, res) => {
  const { email, password } = req.body || {};
  if (email !== env.adminEmail || !env.adminPasswordHash) return res.status(403).json({ error: 'not configured' });
  const valid = compareSync(password || '', env.adminPasswordHash);
  if (!valid) return res.status(401).json({ error: 'invalid' });
  res.cookie('access', 'ok', { httpOnly: true, sameSite: 'lax' });
  const token = randomUUID();
  res.cookie('csrf', token, { sameSite: 'lax' });
  res.json({ csrfToken: token });
});

app.use('/api/admin', csrfProtection, requireAuth);

app.get('/api/admin/orders', async (_req, res) => {
  const list = await prisma.orders.findMany({ orderBy: { created_at: 'desc' }, take: 20, include: { items: true } });
  res.json(list);
});

app.post('/api/admin/orders/:id/status', async (req, res) => {
  const id = req.params.id;
  const { status } = req.body || {};
  const before = await prisma.orders.findUnique({ where: { id } });
  if (!before) return res.status(404).json({ error: 'not found' });
  const after = await prisma.orders.update({ where: { id }, data: { status } });
  await prisma.audit_logs.create({ data: { action_type: 'ORDER_STATUS_CHANGE', entity_type: 'order', entity_id: id, before, after } });
  res.json(after);
});

app.get('/api/admin/audit-logs', async (_req, res) => {
  const logs = await prisma.audit_logs.findMany({ orderBy: { created_at: 'desc' }, take: 50 });
  res.json(logs);
});

// Bot endpoints require bot token header
function requireBot(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers['x-bot-token'];
  if (token !== env.botServiceToken) return res.status(401).json({ error: 'bot unauthorized' });
  next();
}

app.post('/api/bot/onboarding/phone', requireBot, async (req, res) => {
  const { telegram_id, phone } = req.body || {};
  if (!telegram_id || !phone) return res.status(400).json({ error: 'missing' });
  const user = await prisma.users.upsert({
    where: { telegram_id: BigInt(telegram_id) },
    update: { phone },
    create: { telegram_id: BigInt(telegram_id), phone },
  });
  res.json({ ok: true, user });
});

app.get('/api/bot/me', requireBot, async (req, res) => {
  const { telegram_id } = req.query;
  if (!telegram_id) return res.status(400).json({ error: 'missing' });
  const user = await prisma.users.findUnique({ where: { telegram_id: BigInt(telegram_id as string) } });
  res.json(user);
});

export default app;
