import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/lair',
  sessionSecret: process.env.SESSION_SECRET || 'change-me',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@lair.local',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
  botServiceToken: process.env.BOT_SERVICE_TOKEN || 'changeme-bot',
};
