import fs from 'fs';
import path from 'path';

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.split('='))
  );
}

function normalizeText(s = '') {
  return String(s)
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\uFFFD/g, '€')
    .replace(/�/g, '€')
    .split(/\n/)
    .filter((line) => {
      const t = line.trim();
      return t && !/^media:media:\/\//i.test(t) && !/^media:\/\//i.test(t);
    })
    .join('\n');
}

function extractUrl(text) {
  return (String(text).match(/https?:\/\/[^\s)]+/g) || [])[0] || '';
}

function extractButtonUrl(message = {}) {
  const rows = message.reply_markup?.inline_keyboard || [];
  for (const row of rows) {
    for (const btn of row || []) {
      if (btn?.url && /^https?:\/\//i.test(btn.url)) return btn.url;
    }
  }
  return '';
}

function firstLine(text) {
  return (
    String(text)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !/^media:/i.test(line)) || 'Oferta'
  ).slice(0, 120);
}

function extractPrice(text) {
  const labeled = String(text).match(/(?:precio(?:\s+con\s+cup[oó]n)?|precio oferta|precio final|precio)\D{0,40}([0-9]+,[0-9]{2}|[0-9]+\.[0-9]{2}|[0-9]+)\s*€/i);
  if (labeled) return `${labeled[1]}€`;
  const plain = String(text).match(/([0-9]+,[0-9]{2}|[0-9]+\.[0-9]{2})\s*€/);
  return plain ? `${plain[1]}€` : '';
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
  const matchesChannel = wanted.startsWith('@')
    ? chatUser === wanted.slice(1)
    : chatId === wanted;
  if (!matchesChannel) continue;

  const text = normalizeText(m.caption || m.text || '');
  const hasPhoto = Array.isArray(m.photo) && m.photo.length > 0;
  // The website is built from real channel offer posts only: one photo + one caption.
  // This avoids importing assistant/status messages or broken MEDIA placeholder text.
  if (!text || !hasPhoto) continue;

  // Deleted/bad Telegram posts can remain in getUpdates history; never import them.
  if ([3558, 3568, 3570].includes(m.message_id)) continue;

  const trimmed = text.trim();
  if (/publicado/i.test(trimmed)) continue;
  if (/^la imagen es un/i.test(trimmed)) continue;
  if (/^si quieres, también puedo/i.test(trimmed)) continue;
  if (/^si quieres, tambien puedo/i.test(trimmed)) continue;
  if (/^media:/i.test(trimmed)) continue;
  if (!/ofert[oó]n|chollo|precio|amazon|aliexpress/i.test(trimmed)) continue;
  if (/^🛒\s*🔥\s*ofertón amazon\s*🔥\s*logitech g g305 lightspeed/i.test(trimmed)) continue;

  const photo = (m.photo && m.photo[m.photo.length - 1]?.file_id) || null;
  let image = null;
  if (photo) {
    const file = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${photo}`).then((r) => r.json());
    if (file.ok && file.result?.file_path) {
      const imgUrl = `https://api.telegram.org/file/bot${token}/${file.result.file_path}`;
      const ext = path.extname(file.result.file_path) || '.jpg';
      const localName = `${m.message_id}${ext}`;
      const localPath = path.join(imgDir, localName);
      if (!fs.existsSync(localPath)) {
        const buf = Buffer.from(await fetch(imgUrl).then((r) => r.arrayBuffer()));
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
    url: extractUrl(text) || extractButtonUrl(m),
    title: firstLine(text),
    price: extractPrice(text),
    store: /AliExpress/i.test(text) ? 'AliExpress' : 'Amazon',
    description: text.replace(/\s+/g, ' ').slice(0, 200),
  });
}

const deduped = Array.from(
  new Map(
    offers.map((o) => {
      const signature = [o.title, o.description, o.price, o.store, o.url].join('|').toLowerCase();
      return [signature, o];
    })
  ).values()
).filter((o) => o.title || o.image);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(deduped, null, 2));
console.log(`Synced ${deduped.length} offers`);
