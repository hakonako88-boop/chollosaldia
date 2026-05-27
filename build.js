import fs from 'fs';
import path from 'path';

const dataDir = path.resolve('data');
const outDir = path.resolve('dist');
const publicDir = path.resolve('public');
const baseUrl = (process.env.SITE_URL || 'https://chollosaldia.com').replace(/\/$/, '');
const telegramUrl = 'https://t.me/aldiachollos';
const brand = 'Chollos al Día';

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function escapeHtml(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fixText(s = '') {
  return String(s)
    .replace(/(\d[\d.,]*)[?�]/g, '$1€')
    .replace(/�/g, '€')
    .replace(/c\€psulas/gi, 'cápsulas')
    .replace(/estanter\€a/gi, 'estantería')
    .replace(/n\€ivea/gi, 'Nivea')
    .replace(/lavavajillas?\s+Fairy\s+All\s+in\s+One/gi, 'lavavajillas Fairy All in One');
}

function stripMediaLines(s = '') {
  return String(s).split(/\r?\n/).filter((line) => {
    const t = line.trim();
    return t && !/^media:media:\/\//i.test(t) && !/^media:\/\//i.test(t) && !/^MEDIA:/i.test(t);
  }).join('\n');
}

function normalizeBodyText(s = '') {
  return stripMediaLines(fixText(s)).replace(/\s+/g, ' ').trim();
}

function cleanTitle(s = '') {
  return normalizeBodyText(s)
    .replace(/^🛒\s*/u, '')
    .replace(/^OFERT[ÓO]N\s+(AMAZON|ALIEXPRESS)?\s*/i, '')
    .replace(/^🔥\s*/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(s = '') {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'oferta';
}

function parseEuro(value = '') {
  const m = String(value).match(/(\d{1,5}(?:[.,]\d{1,2})?)/);
  return m ? Number(m[1].replace('.', '').replace(',', '.')) : 0;
}

function euro(n) {
  return Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
}

function extractPriceFromText(s = '') {
  const text = String(s);
  const labeled = text.match(/(?:precio(?:\s+con\s+cup[oó]n)?|precio oferta|precio final|precio)\D{0,45}(\d{1,4}(?:[.,]\d{2})?)\s*€/i);
  if (labeled) return `${labeled[1].replace('.', ',')}€`;
  const plain = text.match(/(\d{1,4}(?:[.,]\d{2})?)\s*€/);
  return plain ? `${plain[1].replace('.', ',')}€` : '';
}

function extractPrevious(text = '', description = '') {
  const t = `${text} ${description}`;
  const m = t.match(/(?:antes|precio anterior|pvp|precio habitual)\D{0,40}(\d{1,5}(?:[.,]\d{2})?)\s*€/i);
  return m ? `${m[1].replace('.', ',')}€` : '';
}

function discountPct(price = '', previous = '') {
  const p = parseEuro(price), old = parseEuro(previous);
  if (!p || !old || old <= p) return '';
  return `-${Math.round(((old - p) / old) * 100)}%`;
}

function inferCategory(text = '', store = '') {
  const t = `${store} ${text}`.toLowerCase();
  if (/(móvil|movil|smartphone|xiaomi|redmi|poco|samsung|oneplus|pixel|iphone|oppo|realme|teclado|ratón|raton|monitor|portátil|portatil|pc|gaming|xbox|playstation|switch|auricular|bluetooth|usb|pilas|bater[ií]a)/i.test(t)) return 'Tecnología';
  if (/(freidora|aspirador|hogar|robot|cocina|secador|aire acondicionado|lavadora|nevera|maleta|vileda|fregona|diana|mueble)/i.test(t)) return 'Hogar';
  if (/(taladro|herramienta|bricolaje|atornillador|llave|broca)/i.test(t)) return 'Herramientas';
  if (/(zapatilla|camiseta|chaqueta|moda|ropa|zapato|pantal[oó]n)/i.test(t)) return 'Moda';
  if (/(deporte|fitness|bicicleta|camping|senderismo|dardos)/i.test(t)) return 'Deportes';
  if (/(supermercado|caf[eé]|lomo|comida|alimentaci[oó]n|cápsulas|capsulas)/i.test(t)) return 'Supermercado';
  if (/(beb[eé]|niños|ninos|juguete|bugaboo|carrito)/i.test(t)) return 'Niños y bebés';
  if (/(coche|moto|carplay|aceite|neum[aá]tico)/i.test(t)) return 'Coche y moto';
  if (/amazon/i.test(t)) return 'Ofertas Amazon';
  if (/aliexpress/i.test(t)) return 'Ofertas AliExpress';
  return 'Chollos destacados';
}

function timeAgo(ts) {
  if (!ts) return 'Publicado recientemente';
  const diff = Math.max(1, Math.floor((Date.now() - ts * 1000) / 1000));
  if (diff < 3600) return `Hace ${Math.floor(diff / 60) || 1} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} días`;
}

function formatDate(ts) {
  try { return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(ts * 1000)); } catch { return ''; }
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

const appLinkHosts = new Set(['amzn.to', 's.click.aliexpress.com', 'a.aliexpress.com']);
const urlCache = new Map();

function appIntentForUrl(rawUrl = '') {
  const input = String(rawUrl || '').trim();
  if (!input || !/^https?:\/\//i.test(input)) return input;
  let parsed;
  try { parsed = new URL(input); } catch { return input; }
  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  let packageName = '';
  if (host === 'amzn.to' || host.endsWith('amazon.es') || host.endsWith('amazon.com')) packageName = 'com.amazon.mShop.android.shopping';
  if (host === 's.click.aliexpress.com' || host === 'a.aliexpress.com' || host.endsWith('aliexpress.com')) packageName = 'com.alibaba.aliexpresshd';
  if (!packageName) return input;
  return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=https;package=${packageName};S.browser_fallback_url=${encodeURIComponent(input)};end`;
}

async function resolveOfferUrl(rawUrl = '') {
  const input = String(rawUrl || '').trim();
  if (!input || !/^https?:\/\//i.test(input)) return input;
  let host = '';
  try { host = new URL(input).hostname.replace(/^www\./i, '').toLowerCase(); } catch { return input; }
  if (!appLinkHosts.has(host)) return input;
  if (urlCache.has(input)) return urlCache.get(input);
  try {
    const response = await fetch(input, { method: 'GET', redirect: 'follow' });
    const resolved = response.url || input;
    urlCache.set(input, resolved);
    return resolved;
  } catch {
    urlCache.set(input, input);
    return input;
  }
}

function isBrokenOffer(o = {}) {
  const text = normalizeBodyText(`${o.title || ''} ${o.description || ''} ${o.text || ''}`).toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words).size;
  return !o.message_id || /^la imagen es un/i.test(String(o.title || '')) || /^resumen del mensaje/i.test(String(o.title || '')) || /transcribir el texto exacto|redactarlo con tono/i.test(text) || (!o.url && !o.image && (words.length < 12 || uniqueWords < 8));
}

const rawOffers = readJson(path.join(dataDir, 'offers.json'), []);
const offers = Array.from(new Map(rawOffers.slice().sort((a, b) => (b.date || 0) - (a.date || 0)).filter((o) => !isBrokenOffer(o)).map((o) => {
  const body = normalizeBodyText(o.text || o.description || o.title || '');
  const title = cleanTitle(o.title || body || 'Oferta');
  const price = extractPriceFromText(body) || String(o.price || '').trim();
  const previousPrice = o.previousPrice || o.oldPrice || extractPrevious(body, o.description || '');
  const description = cleanTitle(o.description || body || title).replace(/^🔥\s*/u, '');
  const store = /aliexpress/i.test(`${o.store} ${o.url} ${title}`) ? 'AliExpress' : /amazon/i.test(`${o.store} ${o.url} ${title}`) ? 'Amazon' : (o.store || 'Tienda online');
  const signature = [title, price, store, o.url || ''].join('|').toLowerCase();
  return [signature, { ...o, rawTitle: o.title || '', title, price, previousPrice, discount: discountPct(price, previousPrice), description, store }];
})).values()).map((o) => {
  const category = inferCategory(`${o.title || ''} ${o.description || ''}`, o.store || '');
  const slug = slugify(o.title || `${o.store}-${o.message_id}`);
  const legacySlug = slugify(normalizeBodyText(o.rawTitle || o.title || `${o.store}-${o.message_id}`));
  const tags = Array.from(new Set([o.store, category, o.discount ? 'Descuento' : '', 'Chollo'].filter(Boolean)));
  return { ...o, category, categorySlug: slugify(category), storeSlug: slugify(o.store || 'General'), dateLabel: formatDate(o.date), ago: timeAgo(o.date), slug, legacySlug, tags, detailPath: `/oferta/${slug}/` };
});

await Promise.all(offers.map(async (offer) => {
  const resolved = await resolveOfferUrl(offer.url);
  offer.url = resolved;
  offer.directUrl = resolved;
  offer.appUrl = appIntentForUrl(resolved);
  offer.goPath = `/go/${offer.slug}/`;
  return offer;
}));

const categories = ['Todo', 'Tecnología', 'Hogar', 'Herramientas', 'Moda', 'Deportes', 'Supermercado', 'Niños y bebés', 'Coche y moto', 'Ofertas Amazon', 'Ofertas AliExpress', 'Chollos destacados'];
const storeNames = ['Amazon', 'AliExpress', 'Miravia', 'Carrefour', 'MediaMarkt'];
const featured = (offers.filter((o) => o.discount || /amazon|aliexpress/i.test(o.store)).length ? offers.filter((o) => o.discount || /amazon|aliexpress/i.test(o.store)) : offers).slice(0, 4);
const latest = offers.slice(0, 12);
const relatedFor = (offer) => offers.filter((o) => o.slug !== offer.slug && (o.category === offer.category || o.store === offer.store)).slice(0, 4);

function seoJsonLd() {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebSite', name: brand, url: baseUrl,
    description: 'Ofertas Amazon, AliExpress y chollos diarios con descuentos actualizados.',
    potentialAction: { '@type': 'SearchAction', target: `${baseUrl}/?q={search_term_string}`, 'query-input': 'required name=search_term_string' }
  })}</script>`;
}

function layout({ title, description, canonical = baseUrl, content, extraHead = '', bodyClass = '' }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:type" content="website" />
  ${seoJsonLd()}
  ${extraHead}
  <style>
    :root{--bg:#f5f7fb;--ink:#101828;--muted:#667085;--card:#fff;--line:#e4e7ec;--brand:#ff7a00;--brand2:#ffb000;--dark:#0b1220;--green:#12b76a;--red:#f04438;--blue:#2563eb;--shadow:0 18px 45px rgba(16,24,40,.10)}
    *{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:var(--bg);color:var(--ink)}a{color:inherit;text-decoration:none}img{max-width:100%;display:block}.wrap{max-width:1180px;margin:auto;padding:0 18px}.bottomNotice{border-top:1px solid #1f2937;margin-top:26px;padding-top:18px;color:#d0d5dd;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:14px}.header{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.nav{height:72px;display:flex;align-items:center;justify-content:space-between;gap:16px}.logo{display:flex;align-items:center;gap:10px;font-weight:900;font-size:22px}.logo__mark{width:40px;height:40px;border-radius:14px;background:linear-gradient(135deg,var(--brand),var(--brand2));display:grid;place-items:center;box-shadow:0 10px 25px rgba(255,122,0,.25)}.nav__links{display:flex;gap:16px;align-items:center;color:#344054;font-weight:700;font-size:14px}.telegram{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#229ed9;color:white;padding:11px 15px;border-radius:999px;font-weight:900;box-shadow:0 10px 24px rgba(34,158,217,.25)}.hero{background:radial-gradient(circle at 15% 0%,rgba(255,176,0,.28),transparent 28%),linear-gradient(135deg,#101828,#0b1220 58%,#172554);color:white;padding:54px 0 36px}.hero__grid{display:grid;grid-template-columns:1.12fr .88fr;gap:26px;align-items:center}.kicker{display:inline-flex;gap:8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);padding:8px 12px;border-radius:999px;font-weight:800;color:#fef3c7}.hero h1{font-size:clamp(34px,5vw,62px);line-height:.98;margin:18px 0 14px;letter-spacing:-.04em}.hero p{color:#d0d5dd;font-size:18px;line-height:1.55;max-width:680px}.hero__actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:14px;padding:13px 17px;font-weight:900;cursor:pointer}.btn--primary{background:linear-gradient(135deg,var(--brand2),var(--brand));color:#141414;box-shadow:0 12px 25px rgba(255,122,0,.28)}.btn--ghost{background:rgba(255,255,255,.10);color:white;border:1px solid rgba(255,255,255,.18)}.searchbox{background:white;border-radius:24px;padding:18px;box-shadow:var(--shadow);color:var(--ink)}.searchbox label{display:block;font-weight:900;margin-bottom:10px}.search{width:100%;border:1px solid var(--line);border-radius:14px;padding:15px 16px;font-size:16px}.trust{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.trust div{background:#f9fafb;border:1px solid var(--line);border-radius:16px;padding:12px;font-size:13px;color:#475467;font-weight:700}.section{padding:34px 0}.section__head{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:18px}.section h2{font-size:30px;margin:0;letter-spacing:-.03em}.section p{margin:6px 0 0;color:var(--muted)}.filters,.storebar{display:flex;gap:10px;overflow:auto;padding:2px 0 12px}.chip,.filter{white-space:nowrap;border:1px solid var(--line);background:white;color:#344054;border-radius:999px;padding:10px 13px;font-weight:800;cursor:pointer}.filter.is-active,.chip--hot{background:#111827;color:white;border-color:#111827}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.card{background:var(--card);border:1px solid var(--line);border-radius:22px;overflow:hidden;box-shadow:0 8px 24px rgba(16,24,40,.06);display:flex;flex-direction:column;min-width:0}.card--featured{grid-column:span 2}.card__media{position:relative;aspect-ratio:4/3;background:#eef2f6;display:grid;place-items:center;overflow:hidden}.card__img{width:100%;height:100%;object-fit:cover;transition:transform .2s}.card:hover .card__img{transform:scale(1.035)}.badge{position:absolute;left:12px;top:12px;background:#111827;color:white;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900}.discount{position:absolute;right:12px;top:12px;background:var(--red);color:white;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900}.card__body{padding:15px;display:flex;flex-direction:column;gap:10px;flex:1}.meta{display:flex;gap:8px;flex-wrap:wrap;color:#667085;font-size:12px;font-weight:800}.tag{background:#f2f4f7;border-radius:999px;padding:5px 8px}.card__title{font-size:16px;line-height:1.25;margin:0;letter-spacing:-.01em}.priceRow{display:flex;align-items:baseline;gap:9px}.price{font-size:24px;font-weight:950;color:#dc6803}.old{color:#98a2b3;text-decoration:line-through;font-weight:800}.desc{color:#667085;font-size:14px;line-height:1.45;margin:0}.buy{margin-top:auto;width:100%;background:linear-gradient(135deg,var(--brand2),var(--brand));color:#111;border-radius:14px;padding:13px 15px;text-align:center;font-weight:950}.stores{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}.store{background:white;border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:0 8px 24px rgba(16,24,40,.05)}.store strong{display:block;font-size:18px}.telegramBlock{background:linear-gradient(135deg,#229ed9,#126fa5);color:white;border-radius:28px;padding:26px;display:flex;align-items:center;justify-content:space-between;gap:20px;box-shadow:var(--shadow)}.telegramBlock p{color:#e6f5ff}.footer{background:#0b1220;color:#98a2b3;padding:34px 0;margin-top:36px}.footer__grid{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:18px}.footer a{display:block;margin:8px 0;color:#d0d5dd}.fixedTelegram{position:fixed;right:16px;bottom:16px;z-index:30}.legal{max-width:860px;background:white;border:1px solid var(--line);border-radius:24px;padding:28px;box-shadow:var(--shadow);margin:32px auto;line-height:1.7}.detailHero{padding:34px 0}.detail{display:grid;grid-template-columns:.95fr 1.05fr;gap:24px}.panel{background:white;border:1px solid var(--line);border-radius:26px;padding:22px;box-shadow:var(--shadow)}.detail__img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:22px;background:#eef2f6}.detail h1{font-size:clamp(30px,4vw,48px);line-height:1.05;margin:12px 0}.notice{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:16px;padding:13px;font-weight:700}.related{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.hide{display:none!important}@media(max-width:980px){.hero__grid,.detail{grid-template-columns:1fr}.grid{grid-template-columns:repeat(2,1fr)}.stores,.related{grid-template-columns:repeat(2,1fr)}.nav__links{display:none}.footer__grid{grid-template-columns:1fr 1fr}.card--featured{grid-column:span 1}}@media(max-width:560px){.topbar__in{height:auto;padding:8px 0;align-items:flex-start;flex-direction:column}.nav{height:64px}.hero{padding:34px 0 26px}.grid,.stores,.related{grid-template-columns:1fr}.trust{grid-template-columns:1fr}.telegramBlock{display:block}.footer__grid{grid-template-columns:1fr}.bottomNotice{display:block}.bottomNotice span{display:block;margin-top:6px}.fixedTelegram{left:16px}.fixedTelegram .telegram{width:100%}}
  </style>
</head>
<body class="${bodyClass}">
  <header class="header"><div class="wrap nav"><a class="logo" href="${baseUrl}"><span class="logo__mark">🔥</span><span>${brand}</span></a><nav class="nav__links"><a href="${baseUrl}#destacadas">Destacadas</a><a href="${baseUrl}#ultimas">Últimas</a><a href="${baseUrl}#tiendas">Tiendas</a><a href="${baseUrl}/contacto/">Contacto</a></nav><a class="telegram" href="${telegramUrl}" target="_blank" rel="noreferrer">Únete a Telegram</a></div></header>
  ${content}
  <a class="fixedTelegram telegram" href="${telegramUrl}" target="_blank" rel="noreferrer">📲 Telegram</a>
  <footer class="footer"><div class="wrap"><div class="footer__grid"><div><div class="logo" style="color:white"><span class="logo__mark">🔥</span><span>${brand}</span></div><p>Ofertas Amazon, AliExpress y otras tiendas. Chollos claros, rápidos y sin ruido.</p></div><div><strong>Secciones</strong><a href="${baseUrl}#destacadas">Destacadas</a><a href="${baseUrl}#ultimas">Últimas ofertas</a><a href="${telegramUrl}">Telegram</a></div><div><strong>Tiendas</strong><a href="${baseUrl}#tiendas">Amazon</a><a href="${baseUrl}#tiendas">AliExpress</a><a href="${baseUrl}#tiendas">Más tiendas</a></div><div><strong>Legal</strong><a href="${baseUrl}/aviso-legal/">Aviso legal</a><a href="${baseUrl}/privacidad/">Privacidad</a><a href="${baseUrl}/contacto/">Contacto</a></div></div><div class="bottomNotice"><span>Precios y stock pueden cambiar sin aviso.</span><span>Como afiliados, podemos recibir comisión sin coste adicional para ti.</span></div></div></footer>
  <script>
    const search = document.querySelector('#search');
    const filters = [...document.querySelectorAll('[data-filter]')];
    const cards = [...document.querySelectorAll('[data-card]')];
    function applyFilter(filter='todo') {
      const q = (search?.value || '').toLowerCase().trim();
      cards.forEach(card => {
        const okFilter = filter === 'todo' || card.dataset.cat === filter || card.dataset.store === filter || (card.dataset.tags || '').includes(filter);
        const okSearch = !q || (card.dataset.text || '').includes(q);
        card.classList.toggle('hide', !(okFilter && okSearch));
      });
    }
    filters.forEach(btn => btn.addEventListener('click', () => { filters.forEach(b => b.classList.remove('is-active')); btn.classList.add('is-active'); applyFilter(btn.dataset.filter || 'todo'); }));
    search?.addEventListener('input', () => applyFilter(document.querySelector('.filter.is-active')?.dataset.filter || 'todo'));
  </script>
</body>
</html>`;
}

function offerCard(o, featuredCard = false) {
  const tags = o.tags.slice(0, 3).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const text = escapeHtml(`${o.title} ${o.description} ${o.store} ${o.category} ${o.tags.join(' ')}`.toLowerCase());
  return `<article class="card${featuredCard ? ' card--featured' : ''}" data-card data-cat="${escapeHtml(o.categorySlug)}" data-store="${escapeHtml(o.storeSlug)}" data-tags="${escapeHtml(o.tags.map(slugify).join(' '))}" data-text="${text}">
    <a class="card__media" href="${escapeHtml(o.detailPath)}">${o.image ? `<img class="card__img" src="${escapeHtml(o.image)}" alt="${escapeHtml(o.title)}" loading="lazy">` : '<div>Sin imagen</div>'}<span class="badge">${escapeHtml(o.store)}</span>${o.discount ? `<span class="discount">${escapeHtml(o.discount)}</span>` : ''}</a>
    <div class="card__body"><div class="meta"><span>${escapeHtml(o.category)}</span><span>${escapeHtml(o.ago)}</span></div><h3 class="card__title"><a href="${escapeHtml(o.detailPath)}">${escapeHtml(o.title)}</a></h3><div class="priceRow">${o.price ? `<span class="price">${escapeHtml(o.price)}</span>` : '<span class="price">Ver precio</span>'}${o.previousPrice ? `<span class="old">${escapeHtml(o.previousPrice)}</span>` : ''}</div><p class="desc">${escapeHtml(o.description).slice(0, 120)}</p><div class="meta">${tags}</div><a class="buy" href="${escapeHtml(o.goPath)}" target="_blank" rel="noreferrer">Ver oferta</a></div>
  </article>`;
}

function homePage() {
  const content = `<main>
    <section class="hero"><div class="wrap hero__grid"><div><span class="kicker">🔥 Chollos diarios · Amazon · AliExpress · Más tiendas</span><h1>Ofertas claras para comprar al mejor precio.</h1><p>Encuentra descuentos interesantes en tecnología, hogar, supermercado, moda y más. Publicamos chollos rápidos, con enlaces de afiliado preparados para comprar sin complicaciones.</p><div class="hero__actions"><a class="btn btn--primary" href="#destacadas">Ver ofertas destacadas</a><a class="btn btn--ghost" href="${telegramUrl}" target="_blank" rel="noreferrer">Recibir chollos en Telegram</a></div></div><div class="searchbox"><label for="search">Buscar ofertas</label><input class="search" id="search" placeholder="Busca Amazon, AliExpress, tecnología, hogar..." /><div class="trust"><div>✅ Ofertas revisadas</div><div>⚡ Web rápida</div><div>📲 Telegram diario</div></div></div></div></section>
    <section class="section"><div class="wrap"><div class="filters">${categories.map((c, i) => `<button class="filter${i === 0 ? ' is-active' : ''}" data-filter="${slugify(c)}">${escapeHtml(c)}</button>`).join('')}</div></div></section>
    <section class="section" id="destacadas"><div class="wrap"><div class="section__head"><div><h2>Chollos destacados</h2><p>Ofertas interesantes con precio llamativo o descuento disponible.</p></div><a class="chip chip--hot" href="${telegramUrl}" target="_blank" rel="noreferrer">Únete al canal</a></div><div class="grid">${featured.map((o, i) => offerCard(o, i === 0)).join('')}</div></div></section>
    <section class="section" id="ultimas"><div class="wrap"><div class="section__head"><div><h2>Últimas ofertas publicadas</h2><p>Chollos recientes de Amazon, AliExpress y otras tiendas.</p></div></div><div class="grid">${latest.map((o) => offerCard(o)).join('')}</div></div></section>
    <section class="section" id="tiendas"><div class="wrap"><div class="section__head"><div><h2>Ofertas por tienda</h2><p>Accesos rápidos para encontrar descuentos por comercio.</p></div></div><div class="stores">${storeNames.map((store) => { const count = offers.filter((o) => o.store.toLowerCase() === store.toLowerCase()).length; return `<button class="store" data-filter="${slugify(store)}"><strong>${escapeHtml(store)}</strong><span>${count ? `${count} ofertas` : 'Preparado para nuevas ofertas'}</span></button>`; }).join('')}</div></div></section>
    <section class="section"><div class="wrap"><div class="telegramBlock"><div><h2>Recibe los mejores chollos antes de que se agoten</h2><p>Ofertas diarias en Amazon, AliExpress y más. Sin spam: solo descuentos interesantes.</p></div><a class="btn btn--primary" href="${telegramUrl}" target="_blank" rel="noreferrer">Únete al canal de Telegram</a></div></div></section>
  </main>`;
  return layout({ title: 'Chollos al Día | Ofertas Amazon, AliExpress y descuentos diarios', description: 'Encuentra chollos, ofertas Amazon, descuentos AliExpress y mejores ofertas diarias con enlaces de afiliado claros y rápidos.', content });
}

function detailPage(o) {
  const related = relatedFor(o);
  const productJsonLd = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: o.title, image: o.image ? `${baseUrl}${o.image}` : undefined, description: o.description, offers: { '@type': 'Offer', priceCurrency: 'EUR', price: parseEuro(o.price) || undefined, url: `${baseUrl}${o.goPath}`, availability: 'https://schema.org/InStock' } })}</script>`;
  const content = `<main class="detailHero"><div class="wrap"><div class="detail"><div class="panel">${o.image ? `<img class="detail__img" src="${escapeHtml(o.image)}" alt="${escapeHtml(o.title)}">` : '<div class="detail__img"></div>'}</div><article class="panel"><div class="meta"><span class="tag">${escapeHtml(o.store)}</span><span class="tag">${escapeHtml(o.category)}</span><span class="tag">${escapeHtml(o.ago)}</span>${o.discount ? `<span class="tag">${escapeHtml(o.discount)}</span>` : ''}</div><h1>${escapeHtml(o.title)}</h1><div class="priceRow">${o.price ? `<span class="price">${escapeHtml(o.price)}</span>` : '<span class="price">Ver precio</span>'}${o.previousPrice ? `<span class="old">${escapeHtml(o.previousPrice)}</span>` : ''}</div><p>${escapeHtml(o.description)}</p><a class="btn btn--primary" href="${escapeHtml(o.goPath)}" target="_blank" rel="noreferrer">Ver oferta</a><p class="notice">El precio y la disponibilidad pueden cambiar. Revisa siempre el precio final en la tienda antes de comprar.</p><p class="meta">Como afiliados, podemos recibir una comisión por compras realizadas desde nuestros enlaces, sin coste adicional para ti.</p></article></div>
    <section class="section"><div class="section__head"><div><h2>Ventajas de esta oferta</h2><p>Información rápida para decidir mejor.</p></div></div><div class="stores"><div class="store"><strong>Buen precio para</strong><span>${escapeHtml(o.category.toLowerCase())}</span></div><div class="store"><strong>Tienda</strong><span>${escapeHtml(o.store)}</span></div><div class="store"><strong>Publicado</strong><span>${escapeHtml(o.dateLabel || o.ago)}</span></div><div class="store"><strong>Compra rápida</strong><span>Botón con enlace de afiliado</span></div><div class="store"><strong>Recomendación</strong><span>Compara precio final y envío</span></div></div></section>
    ${related.length ? `<section class="section"><div class="section__head"><div><h2>Ofertas relacionadas</h2><p>Más chollos similares que pueden interesarte.</p></div></div><div class="related">${related.map((x) => offerCard(x)).join('')}</div></section>` : ''}
    </div></main>`;
  return layout({ title: `${o.title} | Oferta en ${o.store}`, description: `${o.title}. ${o.price ? `Precio visto: ${o.price}. ` : ''}Chollo publicado en Chollos al Día.`, canonical: `${baseUrl}${o.detailPath}`, content, extraHead: productJsonLd });
}

function redirectPage(o) {
  const directUrl = o.directUrl || o.url || telegramUrl;
  const appUrl = o.appUrl || appIntentForUrl(directUrl);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Abriendo oferta | ${brand}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;background:#0b1220;color:white;text-align:center;padding:24px}.box{max-width:520px;background:#111827;border:1px solid #344054;border-radius:24px;padding:28px}.btn{display:inline-block;margin-top:18px;padding:14px 18px;border-radius:14px;background:linear-gradient(135deg,#ffb000,#ff7a00);color:#111;font-weight:900;text-decoration:none}.muted{color:#d0d5dd}</style></head><body><div class="box"><h1>Abriendo oferta…</h1><p class="muted">${escapeHtml(o.title)}</p><p class="muted">Si no se abre automáticamente, pulsa el botón.</p><a class="btn" id="open" href="${escapeHtml(directUrl)}">Ver oferta</a></div><script>const directUrl=${JSON.stringify(directUrl)};const appUrl=${JSON.stringify(appUrl)};const open=document.getElementById('open');open.href=appUrl;window.location.href=appUrl;setTimeout(()=>{open.href=directUrl},1800);</script></body></html>`;
}

function genericRedirectPage() {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Abriendo oferta | ${brand}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;background:#0b1220;color:white;text-align:center;padding:24px}.box{max-width:520px;background:#111827;border:1px solid #344054;border-radius:24px;padding:28px}.btn{display:inline-block;margin-top:18px;padding:14px 18px;border-radius:14px;background:linear-gradient(135deg,#ffb000,#ff7a00);color:#111;font-weight:900;text-decoration:none}</style></head><body><div class="box"><h1>Abriendo oferta…</h1><p>Intentando abrir la app de la tienda.</p><a class="btn" id="open" href="${telegramUrl}">Ver oferta</a></div><script>const params=new URLSearchParams(location.search||location.hash.replace(/^#/,'?'));const directUrl=params.get('url')||params.get('u')||'${telegramUrl}';function appIntentForUrl(input){try{const p=new URL(input);const h=p.hostname.replace(/^www\\./i,'').toLowerCase();let pkg='';if(h==='amzn.to'||h.endsWith('amazon.es')||h.endsWith('amazon.com'))pkg='com.amazon.mShop.android.shopping';if(h==='s.click.aliexpress.com'||h==='a.aliexpress.com'||h.endsWith('aliexpress.com'))pkg='com.alibaba.aliexpresshd';if(!pkg)return input;return 'intent://'+p.host+p.pathname+p.search+'#Intent;scheme=https;package='+pkg+';S.browser_fallback_url='+encodeURIComponent(input)+';end'}catch{return input}}const appUrl=appIntentForUrl(directUrl);const open=document.getElementById('open');open.href=appUrl;window.location.href=appUrl;setTimeout(()=>{open.href=directUrl},1800);</script></body></html>`;
}

function redirectHtml(to) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${escapeHtml(to)}"><script>location.replace(${JSON.stringify(to)})</script><title>Redirigiendo</title></head><body><a href="${escapeHtml(to)}">Continuar</a></body></html>`;
}

function legalPage(kind) {
  const pages = {
    contacto: { title: 'Contacto', desc: 'Contacta con Chollos al Día para dudas, ofertas o colaboración.', body: `<h1>Contacto</h1><p>Para consultas sobre ofertas, colaboración o incidencias, puedes escribirnos por Telegram.</p><p><a class="btn btn--primary" href="${telegramUrl}" target="_blank" rel="noreferrer">Contactar por Telegram</a></p><p>No vendemos productos directamente. Redirigimos a tiendas externas como Amazon, AliExpress y otros comercios.</p>` },
    privacidad: { title: 'Política de privacidad', desc: 'Información básica sobre privacidad en Chollos al Día.', body: '<h1>Política de privacidad</h1><p>Esta web muestra ofertas y enlaces a tiendas externas. No solicitamos datos personales mediante formularios propios.</p><p>Podemos usar servicios técnicos de alojamiento y analítica básica para mantener la web rápida y segura.</p><p>Los enlaces externos pueden aplicar sus propias políticas de privacidad y cookies.</p>' },
    'aviso-legal': { title: 'Aviso legal y afiliación', desc: 'Aviso legal, afiliación y responsabilidad sobre precios.', body: '<h1>Aviso legal y afiliación</h1><p>Chollos al Día publica ofertas, descuentos y enlaces a tiendas externas. Algunos enlaces son de afiliado.</p><p><strong>Como afiliados, podemos recibir una comisión por compras realizadas desde nuestros enlaces, sin coste adicional para ti.</strong></p><p>Los precios, cupones, stock y condiciones pueden cambiar sin previo aviso. Revisa siempre el precio final en la tienda antes de comprar.</p><p>No somos responsables de la venta, envío, garantía o atención al cliente de los productos enlazados.</p>' }
  };
  const p = pages[kind];
  return layout({ title: `${p.title} | ${brand}`, description: p.desc, canonical: `${baseUrl}/${kind}/`, content: `<main class="wrap"><section class="legal">${p.body}</section></main>` });
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
copyDir(path.join(publicDir, 'tg'), path.join(outDir, 'tg'));
fs.writeFileSync(path.join(outDir, 'index.html'), homePage());
fs.mkdirSync(path.join(outDir, 'go'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'go', 'index.html'), genericRedirectPage());
for (const offer of offers) {
  const pagePath = path.join(outDir, 'oferta', offer.slug, 'index.html');
  fs.mkdirSync(path.dirname(pagePath), { recursive: true });
  fs.writeFileSync(pagePath, detailPage(offer));
  const goPath = path.join(outDir, 'go', offer.slug, 'index.html');
  fs.mkdirSync(path.dirname(goPath), { recursive: true });
  fs.writeFileSync(goPath, redirectPage(offer));
  if (offer.legacySlug && offer.legacySlug !== offer.slug) {
    const legacyOfferPath = path.join(outDir, 'oferta', offer.legacySlug, 'index.html');
    fs.mkdirSync(path.dirname(legacyOfferPath), { recursive: true });
    fs.writeFileSync(legacyOfferPath, redirectHtml(offer.detailPath));
    const legacyGoPath = path.join(outDir, 'go', offer.legacySlug, 'index.html');
    fs.mkdirSync(path.dirname(legacyGoPath), { recursive: true });
    fs.writeFileSync(legacyGoPath, redirectHtml(offer.goPath));
  }
}
for (const p of ['contacto', 'privacidad', 'aviso-legal']) {
  fs.mkdirSync(path.join(outDir, p), { recursive: true });
  fs.writeFileSync(path.join(outDir, p, 'index.html'), legalPage(p));
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${baseUrl}</loc><lastmod>${new Date().toISOString()}</lastmod></url>\n${offers.map((o) => `  <url><loc>${baseUrl}${o.detailPath}</loc><lastmod>${new Date().toISOString()}</lastmod></url>`).join('\n')}\n  <url><loc>${baseUrl}/contacto/</loc></url>\n  <url><loc>${baseUrl}/privacidad/</loc></url>\n  <url><loc>${baseUrl}/aviso-legal/</loc></url>\n</urlset>`;
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
try { fs.writeFileSync(path.join(outDir, 'CNAME'), `${new URL(baseUrl).hostname}\n`); } catch {}
console.log(`Built ${offers.length} offers.`);
