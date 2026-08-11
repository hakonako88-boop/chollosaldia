import { env } from "cloudflare:workers";

type DealInput = {
  id?: string; title?: string; store?: string; category?: string; price?: number; oldPrice?: number;
  coupon?: string; imageUrl?: string; url?: string; affiliateUrl?: string; badge?: string; active?: boolean;
};

function json(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": status === 200 ? "public, max-age=60, s-maxage=300" : "no-store" } }); }
function cleanText(value: unknown, max = 180) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function safeHttpUrl(value: unknown) { try { const parsed = new URL(String(value)); return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : ""; } catch { return ""; } }
function makeId(input: DealInput) { return cleanText(input.id, 80) || crypto.randomUUID(); }

function affiliateUrl(input: DealInput) {
  const explicit = safeHttpUrl(input.affiliateUrl);
  if (explicit) return explicit;
  const raw = safeHttpUrl(input.url);
  if (!raw) return "";
  const url = new URL(raw);
  if (/(^|\.)amazon\.(es|com)$/i.test(url.hostname) && env.AMAZON_ASSOCIATE_TAG) {
    url.searchParams.set("tag", String(env.AMAZON_ASSOCIATE_TAG));
    return url.toString();
  }
  return raw;
}

async function ensureSchema() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS deals (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, store TEXT NOT NULL, category TEXT NOT NULL, price REAL NOT NULL, old_price REAL NOT NULL, coupon TEXT, image_url TEXT NOT NULL, affiliate_url TEXT NOT NULL, badge TEXT, verified_at TEXT NOT NULL, active INTEGER DEFAULT 1 NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  await env.DB.batch([
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_deals_active_updated ON deals (active, updated_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_deals_category ON deals (category)"),
  ]);
}

async function publishToTelegram(deal: Required<Pick<DealInput, "title"|"store"|"price"|"oldPrice"|"imageUrl">> & { coupon?: string; affiliateUrl: string }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHANNEL_ID) return;
  const discount = Math.max(0, Math.round((1 - deal.price / deal.oldPrice) * 100));
  const caption = [`🔥 <b>${deal.title}</b>`, ``, `🏷 <b>${deal.price.toFixed(2).replace(".", ",")} €</b> <s>${deal.oldPrice.toFixed(2).replace(".", ",")} €</s> · −${discount}%`, deal.coupon ? `🎟 Cupón: <code>${deal.coupon}</code>` : "", `🏪 ${deal.store}`, ``, `<a href="${deal.affiliateUrl.replace(/&/g, "&amp;")}">👉 VER OFERTA</a>`, ``, `<i>El precio puede cambiar. Enlace de afiliado.</i>`].filter(Boolean).join("\n");
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHANNEL_ID, photo: deal.imageUrl, caption, parse_mode: "HTML" }) });
  if (!response.ok) throw new Error(`Telegram respondió ${response.status}`);
}

export async function GET() {
  try {
    await ensureSchema();
    const result = await env.DB.prepare("SELECT id, title, store, category, price, old_price AS oldPrice, coupon, image_url AS imageUrl, affiliate_url AS affiliateUrl, badge, verified_at AS verifiedAt FROM deals WHERE active = 1 ORDER BY updated_at DESC LIMIT 60").all();
    return json({ deals: result.results });
  } catch { return json({ deals: [] }); }
}

export async function POST(request: Request) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!env.IMPORT_SECRET || secret !== env.IMPORT_SECRET) return json({ error: "No autorizado" }, 401);
  let input: DealInput;
  try { input = await request.json() as DealInput; } catch { return json({ error: "JSON no válido" }, 400); }
  const title = cleanText(input.title);
  const storeRaw = cleanText(input.store, 30);
  const store = ["Amazon", "AliExpress"].includes(storeRaw) ? storeRaw : "Otra";
  const imageUrl = safeHttpUrl(input.imageUrl);
  const finalUrl = affiliateUrl(input);
  const price = Number(input.price);
  const oldPrice = Number(input.oldPrice);
  if (!title || !imageUrl || !finalUrl || !Number.isFinite(price) || price <= 0 || !Number.isFinite(oldPrice) || oldPrice < price) return json({ error: "Faltan datos o los precios/URLs no son válidos" }, 422);
  if (store === "AliExpress" && !safeHttpUrl(input.affiliateUrl)) return json({ error: "AliExpress requiere affiliateUrl generado por su portal/API de afiliados" }, 422);
  const now = new Date().toISOString();
  const deal = { id: makeId(input), title, store, category: cleanText(input.category, 40) || "Otros", price, oldPrice, coupon: cleanText(input.coupon, 40) || null, imageUrl, affiliateUrl: finalUrl, badge: cleanText(input.badge, 30) || null, verifiedAt: now };
  await ensureSchema();
  await env.DB.prepare("INSERT INTO deals (id,title,store,category,price,old_price,coupon,image_url,affiliate_url,badge,verified_at,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,store=excluded.store,category=excluded.category,price=excluded.price,old_price=excluded.old_price,coupon=excluded.coupon,image_url=excluded.image_url,affiliate_url=excluded.affiliate_url,badge=excluded.badge,verified_at=excluded.verified_at,active=excluded.active,updated_at=excluded.updated_at")
    .bind(deal.id,deal.title,deal.store,deal.category,deal.price,deal.oldPrice,deal.coupon,deal.imageUrl,deal.affiliateUrl,deal.badge,deal.verifiedAt,input.active === false ? 0 : 1,now,now).run();
  let telegram = "omitido";
  try { await publishToTelegram(deal); telegram = "publicado"; } catch (error) { telegram = error instanceof Error ? error.message : "error"; }
  return json({ ok: true, id: deal.id, telegram }, 201);
}
