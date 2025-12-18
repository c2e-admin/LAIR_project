import { prisma } from './prisma.js';
import { hashSync } from 'bcryptjs';
import { env } from './env.js';

async function main() {
  await prisma.loyalty_tiers.upsert({
    where: { tier: 'SILVER' },
    update: { threshold_uah: BigInt(20000), discount_percent: 5, priority_support: false },
    create: { tier: 'SILVER', threshold_uah: BigInt(20000), discount_percent: 5, priority_support: false },
  });
  await prisma.loyalty_tiers.upsert({
    where: { tier: 'GOLD' },
    update: { threshold_uah: BigInt(50000), discount_percent: 10, priority_support: false },
    create: { tier: 'GOLD', threshold_uah: BigInt(50000), discount_percent: 10, priority_support: false },
  });
  await prisma.loyalty_tiers.upsert({
    where: { tier: 'PLATINUM' },
    update: { threshold_uah: BigInt(120000), discount_percent: 15, priority_support: true },
    create: { tier: 'PLATINUM', threshold_uah: BigInt(120000), discount_percent: 15, priority_support: true },
  });

  const devices = [
    { device_type: 'GAMING_LAPTOP', hourly_price_uah: BigInt(600), daily_price_uah: BigInt(3500), deposit_required_uah: BigInt(5000) },
    { device_type: 'GAMING_PC', hourly_price_uah: BigInt(500), daily_price_uah: BigInt(3000), deposit_required_uah: BigInt(4000) },
    { device_type: 'PS5', hourly_price_uah: BigInt(400), daily_price_uah: BigInt(2500), deposit_required_uah: BigInt(3000) },
    { device_type: 'VR', hourly_price_uah: BigInt(350), daily_price_uah: BigInt(2000), deposit_required_uah: BigInt(2500) },
    { device_type: 'MONITOR', hourly_price_uah: BigInt(150), daily_price_uah: BigInt(700), deposit_required_uah: BigInt(0) },
  ];
  for (const d of devices) {
    await prisma.pricing_devices.upsert({
      where: { device_type: d.device_type as any },
      update: d,
      create: { ...d, is_active: true },
    });
  }

  await prisma.config_items.upsert({
    where: { key: 'MAX_DISCOUNT_PERCENT' },
    update: { value: 25 },
    create: { key: 'MAX_DISCOUNT_PERCENT', value: 25 },
  });

  if (env.adminEmail && env.adminPasswordHash) {
    await prisma.users.upsert({
      where: { telegram_id: BigInt(0) },
      update: {},
      create: { telegram_id: BigInt(0), phone: 'n/a', role: 'ADMIN', loyalty_tier: 'NONE' },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
