import fs from 'fs';
import path from 'path';

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => line.split('='))
  );
}

const env = {
  ...readEnvFile(path.resolve('.env')),
  ...readEnvFile(path.resolve('..', '.env')),
};

const token = process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID || env.TELEGRAM_CHANNEL_ID || env.TELEGRAM_CHAT_ID || '-1002549368004';
const out = path.resolve('data', 'offers.json');
const imgDir = path.resolve('public', 'tg');

if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN');
fs.mkdirSync(imgDir, { recursive: true });

const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
const j = await res.json();
if (!j.ok) throw new Error(JSON.stringify(j));

const offers = [];
for (const u of j.result || []) {
  const m = u.channel_post || u.edited_channel_post;
  if (!m) continue;
  const chatId = String(m.chat?.id || '');
  const chatUser = String(m.chat?.username || '').toLowerCase();
  const wanted = String(channelId).trim().toLowerCase();
  const matchesChannel =
    wanted.startsWith('@')
      ? chatUser === wanted.slice(1)
      : chatId === wanted;
  if (!matchesChannel) continue;
  const text = m.caption || m.text || '';
  const hasPhoto = Array.isArray(m.photo) && m.photo.length > 0;
  if (!text && !hasPhoto) continue;
  if (/^✅?\s*Publicado\s*$/i.test(text.trim())) continue;
  if (/^✅?\s*Publicado/i.test(text.trim()) && !hasPhoto) continue;
  if (/^la imagen es un/i.test(text.trim())) continue;
  if (/^si quieres, también puedo/i.test(text.trim())) continue;
  if (/^si quieres, tambien puedo/i.test(text.trim())) continue;

  const photo = (m.photo && m.photo[m.photo.length - 1]?.file_id) || null;
  let image = null;
  if (photo) {
    const file = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${photo}`).then(r => r.json());
    if (file.ok && file.result?.file_path) {
      const imgUrl = `https://api.telegram.org/file/bot${token}/${file.result.file_path}`;
      const ext = path.extname(file.result.file_path) || '.jpg';
      const localName = `${m.message_id}${ext}`;
      const localPath = path.join(imgDir, localName);
      if (!fs.existsSync(localPath)) {
        const buf = Buffer.from(await fetch(imgUrl).then(r => r.arrayBuffer()));
        fs.writeFileSync(localPath, buf);
      }
      image = `/tg/${localName}`;
    }
  }

  offers.push({
    message_id: m.message_id,
    date: m.date,
    text,
    image,
    url: extractUrl(text),
    title: firstLine(text),
    price: extractPrice(text),
    store: /AliExpress/i.test(text) ? 'AliExpress' : 'Amazon',
    description: text.replace(/\s+/g, ' ').slice(0, 200),
  });
}

const deduped = Array.from(
  new Map(offers.map((o) => [String(o.message_id), o])).values()
).filter((o) => o.title || o.image);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(deduped, null, 2));
console.log(`Synced ${deduped.length} offers`);

function extractUrl(text) { return (text.match(/https?:\/\/[^\s)]+/g) || [])[0] || ''; }
function firstLine(text) { return (text.split(/\r?\n/).find(Boolean) || 'Oferta').slice(0, 120); }
function extractPrice(text) { return (text.match(/([0-9]+,[0-9]{2}|[0-9]+\.[0-9]{2}|[0-9]+)€/) || [,''])[1] ? `${(text.match(/([0-9]+,[0-9]{2}|[0-9]+\.[0-9]{2}|[0-9]+)€/) || [,''])[1]}€` : ''; }
