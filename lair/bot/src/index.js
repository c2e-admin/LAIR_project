import { Telegraf, Markup } from 'telegraf';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
const bot = new Telegraf(process.env.BOT_TOKEN || '');
const backend = process.env.BACKEND_URL || 'http://backend:3000';
const botToken = process.env.BOT_SERVICE_TOKEN || 'changeme-bot';

bot.start(async (ctx) => {
  const phoneBtn = Markup.button.contactRequest('📲 Поділитися номером');
  await ctx.reply('Вітаємо у LAIR! Поділіться номером щоб продовжити.', Markup.keyboard([[phoneBtn]]).oneTime().resize());
});

bot.on('contact', async (ctx) => {
  const phone = ctx.message.contact.phone_number;
  const telegramId = ctx.from.id;
  await fetch(`${backend}/api/bot/onboarding/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bot-token': botToken },
    body: JSON.stringify({ telegram_id: telegramId, phone }),
  });
  await ctx.reply('Дякуємо! Номер збережено.', Markup.removeKeyboard());
});

bot.command('balance', async (ctx) => {
  const me = await fetch(`${backend}/api/bot/me?telegram_id=${ctx.from.id}`, {
    headers: { 'x-bot-token': botToken },
  }).then((r) => r.json());
  await ctx.reply(`Баланс: ${Number(me?.balance_uah || 0)} грн`);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
