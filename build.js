import fs from 'fs';
import path from 'path';

const dataDir = path.resolve('data');
const outDir = path.resolve('dist');
const publicDir = path.resolve('public');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(s = '') {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'general';
}

function inferCategory(text = '', store = '') {
  const t = `${store} ${text}`.toLowerCase();
  if (/(tv|televisor|smart tv|qled|oled|mini led|qd-mini|hdr)/i.test(t)) return 'TV';
  if (/(auricular|headphone|soundbar|altavoz|speaker|audio)/i.test(t)) return 'Audio';
  if (/(móvil|movil|smartphone|xiaomi|redmi|poco|samsung|oneplus|pixel|iphone|oppo|realme)/i.test(t)) return 'Móviles';
  if (/(portátil|portatil|monitor|teclado|ratón|raton|pc|ordenador|mini pc|impresora|raton gaming)/i.test(t)) return 'PC';
  if (/(reloj|watch|wearable|pulsera|gps|nfc|smartwatch)/i.test(t)) return 'Wearables';
  if (/(freidora|aspirador|hogar|robot|cocina|secador|aire acondicionado|lavadora|nevera|maleta|camping)/i.test(t)) return 'Hogar';
  if (/(gaming|xbox|playstation|switch|videoconsola|ps5|juego|mandos|ratón gaming|raton gaming)/i.test(t)) return 'Gaming';
  if (/amazon/i.test(t)) return 'Amazon';
  if (/aliexpress/i.test(t)) return 'AliExpress';
  return 'General';
}

function formatDate(ts) {
  try {
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(ts * 1000));
  } catch {
    return '';
  }
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const rawOffers = readJson(path.join(dataDir, 'offers.json'), []);
const offers = rawOffers.slice().reverse().map((o) => {
  const category = inferCategory(`${o.title || ''} ${o.description || ''}`, o.store || '');
  return {
    ...o,
    category,
    categorySlug: slugify(category),
    storeSlug: slugify(o.store || 'General'),
    dateLabel: formatDate(o.date),
  };
});

const baseUrl = (process.env.SITE_URL || 'https://chollosaldia.com').replace(/\/$/, '');
const hostName = (() => {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return '';
  }
})();

const imageOffers = offers.filter((o) => o.image);
const featured = (imageOffers.length ? imageOffers : offers).slice(0, 3);
const latest = offers.slice(0, 12);
const categories = [
  'Todo',
  ...new Set(offers.map((o) => o.category)),
  ...new Set(offers.map((o) => o.store).filter(Boolean)),
].filter(Boolean);

const stats = {
  offers: offers.length,
  categories: new Set(offers.map((o) => o.category)).size,
  stores: new Set(offers.map((o) => o.store).filter(Boolean)).size,
};

const latestJsonLd = offers.slice(0, 10).map((o, idx) => ({
  '@type': 'ListItem',
  position: idx + 1,
  url: `${baseUrl}${o.url || ''}`,
  name: o.title || 'Oferta',
}));

const jsonLd = `
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Chollos al Día',
  url: baseUrl,
  description: 'Ofertas y chollos actualizados desde Telegram.',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${baseUrl}/?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
})}</script>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Chollos al Día',
  url: baseUrl,
  hasPart: {
    '@type': 'ItemList',
    itemListElement: latestJsonLd,
  },
})}</script>`;

function card(o, featuredCard = false) {
  const title = escapeHtml(o.title || 'Oferta');
  const price = escapeHtml(o.price || '');
  const url = escapeHtml(o.url || '#');
  const image = o.image
    ? `<img class="card__img" src="${escapeHtml(o.image)}" alt="${title}" loading="lazy">`
    : `<div class="card__placeholder">Sin imagen</div>`;
  const desc = escapeHtml(o.description || '').slice(0, 180);
  const store = escapeHtml(o.store || '');
  const category = escapeHtml(o.category || 'General');
  const dateLabel = escapeHtml(o.dateLabel || '');
  const text = escapeHtml(`${o.title || ''} ${o.description || ''} ${o.store || ''} ${o.category || ''}`);
  return `
  <article class="card${featuredCard ? ' card--featured' : ''}" data-cat="${escapeHtml(o.categorySlug)}" data-store="${escapeHtml(o.storeSlug)}" data-text="${text}">
    <a class="card__media" href="${url}" target="_blank" rel="noreferrer">${image}</a>
    <div class="card__body">
      <div class="card__meta">
        <span>${store}</span>
        <span>${category}</span>
        ${dateLabel ? `<span>${dateLabel}</span>` : ''}
      </div>
      <h2 class="card__title"><a href="${url}" target="_blank" rel="noreferrer">${title}</a></h2>
      <div class="card__price">${price}</div>
      <p class="card__desc">${desc}</p>
      <a class="btn" href="${url}" target="_blank" rel="noreferrer">Ver oferta</a>
    </div>
  </article>`;
}

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Chollos al Día | Ofertas y chollos actualizados</title>
<meta name="description" content="Ofertas y chollos actualizados desde Telegram. Amazon, AliExpress, tecnología, hogar y más." />
<link rel="canonical" href="${baseUrl}" />
<meta property="og:title" content="Chollos al Día" />
<meta property="og:description" content="Ofertas y chollos actualizados desde Telegram." />
<meta property="og:type" content="website" />
<meta property="og:url" content="${baseUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="robots" content="index,follow" />
${jsonLd}
<style>
  :root{
    --bg:#07111d;
    --bg2:#0d1726;
    --card:#0f1a2d;
    --card2:#12213a;
    --txt:#e9f2ff;
    --muted:#99abc5;
    --line:#20314c;
    --accent:#ffb000;
    --accent2:#63d2ff;
    --shadow:0 12px 40px rgba(0,0,0,.26);
  }
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;background:radial-gradient(1200px 600px at 20% 0%, #12203b 0%, transparent 60%),linear-gradient(180deg,var(--bg),var(--bg2));color:var(--txt)}
  a{color:inherit}
  .container{max-width:1180px;margin:0 auto;padding:0 20px}
  .topbar{position:sticky;top:0;z-index:20;backdrop-filter:blur(14px);background:rgba(7,17,29,.76);border-bottom:1px solid rgba(32,49,76,.65)}
  .topbar__inner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0}
  .brand{display:flex;align-items:center;gap:12px;text-decoration:none}
  .brand__mark{width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,var(--accent),#ff7a00);display:grid;place-items:center;color:#111;font-weight:900;box-shadow:var(--shadow)}
  .brand__text strong{display:block;font-size:15px;line-height:1}
  .brand__text span{display:block;font-size:12px;color:var(--muted);margin-top:4px}
  .topbar__actions{display:flex;gap:10px;flex-wrap:wrap}
  .pill,.btn{display:inline-flex;align-items:center;justify-content:center;border-radius:14px;text-decoration:none;font-weight:800;border:1px solid transparent}
  .pill{padding:10px 14px;background:rgba(255,255,255,.04);border-color:var(--line);color:var(--txt)}
  .pill--accent,.btn{background:linear-gradient(135deg,var(--accent),#ff8a00);color:#111}
  .hero{padding:38px 0 18px}
  .hero__grid{display:grid;grid-template-columns:1.15fr .85fr;gap:22px;align-items:stretch}
  .hero__card{background:linear-gradient(180deg,rgba(18,33,58,.95),rgba(15,26,45,.95));border:1px solid var(--line);border-radius:28px;box-shadow:var(--shadow);padding:28px}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accent2);margin-bottom:12px}
  h1{margin:0;font-size:clamp(34px,5vw,58px);line-height:.96;letter-spacing:-.04em}
  .hero p{color:var(--muted);line-height:1.7;font-size:16px;max-width:62ch}
  .hero__cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}
  .hero__stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .stat{background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:22px;padding:18px;display:flex;flex-direction:column;justify-content:center;min-height:120px}
  .stat strong{font-size:32px;line-height:1}
  .stat span{color:var(--muted);margin-top:8px;font-size:13px;line-height:1.4}
  .section{padding:18px 0 34px}
  .section__head{display:flex;align-items:end;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:16px}
  .section__head h2{margin:0;font-size:28px;letter-spacing:-.03em}
  .section__head p{margin:0;color:var(--muted)}
  .filters{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 22px}
  .filter{cursor:pointer;border:none;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid var(--line);color:var(--txt);font-weight:700}
  .filter.is-active{background:linear-gradient(135deg,var(--accent2),#92f0ff);color:#07111d;border-color:transparent}
  .searchbar{display:flex;gap:10px;align-items:center;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:18px;padding:12px 14px;margin-top:16px}
  .searchbar input{flex:1;border:none;background:transparent;color:var(--txt);outline:none;font:inherit}
  .searchbar input::placeholder{color:#8ba0be}
  .featured{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
  .card{background:linear-gradient(180deg,var(--card),rgba(15,26,45,.88));border:1px solid var(--line);border-radius:24px;overflow:hidden;box-shadow:var(--shadow);display:flex;flex-direction:column;min-height:100%}
  .card--featured{border-color:rgba(255,176,0,.5)}
  .card__media{display:block;text-decoration:none}
  .card__img,.card__placeholder{width:100%;height:220px;display:block;object-fit:cover;background:linear-gradient(135deg,#101c31,#07111d);}
  .card__placeholder{display:grid;place-items:center;color:var(--muted);font-weight:800;letter-spacing:.03em}
  .card__body{padding:18px}
  .card__meta{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
  .card__meta span{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#a9b9d0;background:rgba(255,255,255,.05);border:1px solid var(--line);padding:6px 8px;border-radius:999px}
  .card__title{margin:0 0 10px;font-size:18px;line-height:1.2;letter-spacing:-.02em}
  .card__title a{text-decoration:none}
  .card__price{font-size:28px;font-weight:900;color:var(--accent);margin-bottom:10px}
  .card__desc{margin:0 0 16px;color:var(--muted);line-height:1.6;font-size:14px}
  .btn{padding:12px 16px;box-shadow:0 8px 18px rgba(255,176,0,.18)}
  .two-col{display:grid;grid-template-columns:1.1fr .9fr;gap:18px}
  .panel{background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:24px;padding:22px;box-shadow:var(--shadow)}
  .stores{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:14px}
  .store{display:flex;justify-content:space-between;gap:12px;align-items:center;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:18px;padding:14px 16px;text-decoration:none}
  .store strong{display:block}
  .store span{display:block;color:var(--muted);font-size:13px;margin-top:4px}
  .faq{display:grid;gap:12px}
  .faq details{background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:18px;padding:14px 16px}
  .faq summary{cursor:pointer;font-weight:800}
  .faq p{margin:10px 0 0;color:var(--muted);line-height:1.6}
  .empty{padding:26px;border:1px dashed var(--line);border-radius:24px;color:var(--muted);text-align:center;background:rgba(255,255,255,.03)}
  .footer{padding:26px 0 38px;color:var(--muted);font-size:14px}
  .footer a{color:#cfe7ff}
  .hidden{display:none !important}
  @media (max-width: 1080px){
    .hero__grid,.two-col,.featured,.grid{grid-template-columns:1fr}
  }
  @media (max-width: 640px){
    .topbar__inner{align-items:flex-start;flex-direction:column}
    .hero__card,.panel{padding:20px}
    .hero__stats{grid-template-columns:1fr}
    .stores{grid-template-columns:1fr}
  }
</style></head>
<body>
<header class="topbar">
  <div class="container topbar__inner">
    <a class="brand" href="${baseUrl}">
      <div class="brand__mark">C</div>
      <div class="brand__text"><strong>Chollos al Día</strong><span>Ofertas reales desde Telegram</span></div>
    </a>
    <div class="topbar__actions">
      <a class="pill" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Telegram</a>
      <a class="pill pill--accent" href="#ultimas">Ver ofertas</a>
    </div>
  </div>
</header>

<main>
  <section class="hero">
    <div class="container hero__grid">
      <div class="hero__card">
        <div class="eyebrow">Chollos, ofertas y precio bueno</div>
        <h1>Ofertas actualizadas cada vez que publicas en Telegram.</h1>
        <p>Una web rápida, clara y pensada para SEO: imágenes reales, filtros, categorías y acceso directo a cada oferta. Sin ruido, sin relleno, solo chollos que merecen la pena.</p>
        <div class="hero__cta">
          <a class="pill pill--accent" href="#ultimas">Ver últimas ofertas</a>
          <a class="pill" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Abrir canal</a>
        </div>
        <div class="searchbar" role="search" aria-label="Buscar ofertas">
          <span style="color:var(--muted);font-weight:900">⌕</span>
          <input id="search" type="search" placeholder="Busca un producto, tienda o categoría...">
        </div>
      </div>
      <div class="hero__card">
        <div class="hero__stats">
          <div class="stat"><strong>${stats.offers}</strong><span>Ofertas publicadas</span></div>
          <div class="stat"><strong>${stats.categories}</strong><span>Categorías detectadas</span></div>
          <div class="stat"><strong>${stats.stores}</strong><span>Tiendas seguidas</span></div>
        </div>
        <div style="margin-top:14px;color:var(--muted);line-height:1.7">
          <strong style="color:var(--txt)">Lo mejor:</strong> fotos originales del post, enlace directo, y la web se actualiza sola desde tu canal.
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section__head">
        <div>
          <h2>Filtros rápidos</h2>
          <p>Filtra por categoría o por tienda.</p>
        </div>
      </div>
      <div class="filters" id="filters">
        ${categories.map((c, i) => `<button class="filter${i === 0 ? ' is-active' : ''}" data-filter="${slugify(c)}">${escapeHtml(c)}</button>`).join('')}
      </div>
    </div>
  </section>

  <section class="section" id="destacadas">
    <div class="container">
      <div class="section__head">
        <div>
          <h2>Destacadas</h2>
          <p>Las 3 más recientes, con imagen y acceso directo.</p>
        </div>
      </div>
      ${featured.length ? `<div class="featured">${featured.map((o) => card(o, true)).join('')}</div>` : '<div class="empty">Aún no hay ofertas importadas. Publica algo en Telegram y actualiza la web.</div><div class="featured">' + [1,2,3].map(() => `<article class="card card--featured"><div class="card__placeholder">Imagen de oferta</div><div class="card__body"><div class="card__meta"><span>Telegram</span><span>Destacada</span></div><h2 class="card__title">Oferta destacada</h2><div class="card__price">-</div><p class="card__desc">En cuanto publiques ofertas con foto en Telegram, aparecerán aquí automáticamente.</p><a class="btn" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Abrir canal</a></div></article>`).join('') + '</div>'}
    </div>
  </section>

  <section class="section" id="ultimas">
    <div class="container">
      <div class="section__head">
        <div>
          <h2>Últimas ofertas</h2>
          <p>Se van cargando desde Telegram.</p>
        </div>
      </div>
      ${latest.length ? `<div class="grid" id="offerGrid">${latest.map((o) => card(o)).join('')}</div>` : '<div class="grid" id="offerGrid">' + [1,2,3,4].map(() => `<article class="card"><div class="card__placeholder">Esperando oferta</div><div class="card__body"><div class="card__meta"><span>Telegram</span><span>Nuevo</span></div><h2 class="card__title">Publica una oferta con foto</h2><div class="card__price">-</div><p class="card__desc">El contenido se importa automáticamente desde tu canal.</p><a class="btn" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Abrir canal</a></div></article>`).join('') + '</div>'}
    </div>
  </section>

  <section class="section">
    <div class="container two-col">
      <div class="panel">
        <div class="section__head" style="margin-bottom:8px">
          <div>
            <h2>Tiendas que seguimos</h2>
            <p>Las que más chollos suelen dar.</p>
          </div>
        </div>
        <div class="stores">
          <a class="store" href="/amazon/" aria-label="Amazon"><div><strong>Amazon</strong><span>Ofertas flash y Prime</span></div><span>→</span></a>
          <a class="store" href="/aliexpress/" aria-label="AliExpress"><div><strong>AliExpress</strong><span>Cupones y descuentos</span></div><span>→</span></a>
          <a class="store" href="/mediamarkt/" aria-label="MediaMarkt"><div><strong>MediaMarkt</strong><span>Tecnología y hogar</span></div><span>→</span></a>
          <a class="store" href="/pccomponentes/" aria-label="PcComponentes"><div><strong>PcComponentes</strong><span>PC y gaming</span></div><span>→</span></a>
        </div>
      </div>
      <div class="panel">
        <div class="section__head" style="margin-bottom:8px">
          <div>
            <h2>Preguntas rápidas</h2>
            <p>Texto útil para SEO.</p>
          </div>
        </div>
        <div class="faq">
          <details open><summary>¿Cada cuánto se actualiza?</summary><p>La web se actualiza sola cuando publicas en Telegram. Las imágenes se copian automáticamente.</p></details>
          <details><summary>¿Cómo se eligen los chollos?</summary><p>Priorizamos productos con buen precio, tiendas fiables y ofertas que realmente merecen la pena.</p></details>
          <details><summary>¿Puedo abrir el enlace desde móvil?</summary><p>Sí, cada tarjeta lleva al producto original para comprar al momento.</p></details>
        </div>
      </div>
    </div>
  </section>
</main>

<footer class="footer">
  <div class="container">
    SEO básico listo • imágenes servidas localmente • sincronizable con Telegram • <a href="/sitemap.xml">sitemap</a>
  </div>
</footer>

<script>
  const filters = Array.from(document.querySelectorAll('.filter'));
  const cards = Array.from(document.querySelectorAll('.card'));
  const search = document.getElementById('search');
  const grid = document.getElementById('offerGrid');

  function applyFilter(filter) {
    const q = (search?.value || '').trim().toLowerCase();
    cards.forEach((card) => {
      const text = (card.dataset.text || '').toLowerCase();
      const cat = card.dataset.cat || '';
      const store = card.dataset.store || '';
      const matchQuery = !q || text.includes(q);
      const matchFilter = !filter || filter === 'todo' || filter === cat || filter === store;
      card.classList.toggle('hidden', !(matchQuery && matchFilter));
    });
    const visible = cards.filter((card) => !card.classList.contains('hidden'));
    if (grid) {
      let empty = document.getElementById('emptyResults');
      if (!visible.length) {
        if (!empty) {
          empty = document.createElement('div');
          empty.id = 'emptyResults';
          empty.className = 'empty';
          empty.textContent = 'No hay resultados con ese filtro.';
          grid.after(empty);
        }
      } else if (empty) {
        empty.remove();
      }
    }
  }

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      applyFilter(btn.dataset.filter || 'todo');
    });
  });

  search?.addEventListener('input', () => {
    const active = document.querySelector('.filter.is-active');
    applyFilter(active?.dataset.filter || 'todo');
  });
</script>
</body>
</html>`;

fs.mkdirSync(outDir, { recursive: true });
copyDir(path.join(publicDir, 'tg'), path.join(outDir, 'tg'));
fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}</loc><lastmod>${new Date().toISOString()}</lastmod></url>
</urlset>`;
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
if (hostName) fs.writeFileSync(path.join(outDir, 'CNAME'), `${hostName}\n`);
console.log(`Built ${offers.length} offers.`);
