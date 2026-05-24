import fs from 'fs';
import path from 'path';

const dataDir = path.resolve('data');
const outDir = path.resolve('dist');
const publicDir = path.resolve('public');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function escapeHtml(s='') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function card(o) {
  const title = escapeHtml(o.title || 'Oferta');
  const price = escapeHtml(o.price || '');
  const url = escapeHtml(o.url || '#');
  const image = o.image ? `<img src="${escapeHtml(o.image)}" alt="${title}" loading="lazy">` : '';
  const desc = escapeHtml(o.description || '').slice(0, 220);
  const store = escapeHtml(o.store || '');
  return `
    <article class="card">
      ${image}
      <div class="body">
        <div class="meta">${store}</div>
        <h2>${title}</h2>
        <div class="price">${price}</div>
        <p>${desc}</p>
        <a class="btn" href="${url}" target="_blank" rel="noreferrer">Ver oferta</a>
      </div>
    </article>`;
}

const offers = readJson(path.join(dataDir, 'offers.json'), []).slice().reverse();
const now = new Date().toISOString();
const baseUrl = (process.env.SITE_URL || 'https://chollosaldia.com').replace(/\/$/, '');
const hostName = (() => {
  try { return new URL(baseUrl).hostname; } catch { return ''; }
})();
const latest = offers[0] || null;
const jsonLd = latest ? `
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Chollos al Día",
  "url": baseUrl,
  "description": "Ofertas y chollos actualizados desde Telegram.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": `${baseUrl}/?q={search_term_string}`,
    "query-input": "required name=search_term_string"
  }
})}</script>` : '';
const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Chollos al Día | Ofertas y chollos actualizados</title>
<meta name="description" content="Ofertas y chollos actualizados desde Telegram. Amazon, AliExpress y más." />
<link rel="canonical" href="${baseUrl}" />
<meta property="og:title" content="Chollos al Día" />
<meta property="og:description" content="Ofertas y chollos actualizados desde Telegram." />
<meta property="og:type" content="website" />
<meta property="og:url" content="${baseUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="robots" content="index,follow" />
${jsonLd}
<style>
  :root{--bg:#0b0f14;--card:#111826;--txt:#e5eef8;--muted:#9fb0c3;--accent:#ffb000;--line:#223047}
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,Segoe UI,Roboto,Arial;background:linear-gradient(180deg,#0b0f14,#0f1722);color:var(--txt)}
  header{padding:32px 20px;max-width:1100px;margin:0 auto}
  h1{margin:0 0 8px;font-size:40px;letter-spacing:-.03em}
  p{color:var(--muted);line-height:1.5}
  .top{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-top:16px}
  .chip{border:1px solid var(--line);padding:8px 12px;border-radius:999px;color:var(--muted);text-decoration:none}
  main{max-width:1100px;margin:0 auto;padding:0 20px 40px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.25)}
  .card img{width:100%;height:220px;object-fit:cover;display:block;background:#0d131c}
  .body{padding:16px}
  .meta{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
  h2{font-size:18px;line-height:1.2;margin:8px 0 10px}
  .price{font-size:24px;font-weight:800;color:var(--accent);margin-bottom:10px}
  .btn{display:inline-block;margin-top:8px;background:var(--accent);color:#111;padding:10px 14px;border-radius:12px;text-decoration:none;font-weight:800}
  .empty{grid-column:1/-1;padding:24px;border:1px dashed var(--line);border-radius:18px;color:var(--muted)}
  footer{max-width:1100px;margin:0 auto;padding:0 20px 32px;color:var(--muted);font-size:14px}
</style></head>
<body>
<header>
  <h1>Chollos al Día</h1>
  <p>Ofertas y chollos actualizados automáticamente desde Telegram.</p>
  <div class="top">
    <a class="chip" href="https://t.me/aldiachollos" target="_blank" rel="noreferrer">Telegram</a>
    <span class="chip">Actualizado: ${escapeHtml(now)}</span>
  </div>
</header>
<main>${offers.length ? offers.map(card).join('') : '<div class="empty">Aún no hay ofertas importadas. Ejecuta la sincronización con Telegram.</div>'}</main>
<footer>
  SEO básico listo • imágenes servidas localmente • sincronizable con Telegram • 
  <a href="/sitemap.xml">sitemap</a>
</footer>
</body>
</html>`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}</loc><lastmod>${new Date().toISOString()}</lastmod></url>
</urlset>`;
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
if (hostName && hostName !== 'chollosaldia.com') fs.writeFileSync(path.join(outDir, 'CNAME'), `${hostName}\n`);
console.log(`Built ${offers.length} offers.`);
