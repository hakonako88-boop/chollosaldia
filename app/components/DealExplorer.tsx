"use client";

import { useEffect, useMemo, useState } from "react";
import rawOffers from "../../data/offers.json";

export type Deal = {
  id: string;
  title: string;
  store: "Amazon" | "AliExpress" | "Otra";
  category: string;
  price: number;
  oldPrice: number;
  coupon?: string;
  imageUrl: string;
  affiliateUrl: string;
  badge?: string;
  verifiedAt: string;
  isDemo?: boolean;
};

type LegacyOffer = {
  message_id?: number;
  chollometroId?: string;
  title?: string;
  text?: string;
  image?: string;
  url?: string;
  price?: string;
  previousPrice?: string;
  store?: string;
  date?: number;
};

function parsePrice(value?: string) {
  const normalized = String(value ?? "").replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanTitle(value?: string) {
  return String(value ?? "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/^(OFERT[ÓO]N\s+(AMAZON|ALIEXPRESS)\s*[-–—:]?\s*)/i, "")
    .replace(/[🔥🚨]+/gu, "")
    .trim();
}

function categoryFor(offer: LegacyOffer) {
  const text = `${offer.title ?? ""} ${offer.text ?? ""}`.toLocaleLowerCase("es");
  if (/café|capsula|lomo|aliment|cocina|táper/.test(text)) return "Cocina";
  if (/hogar|vileda|piscina|jardín|mueble|limpieza/.test(text)) return "Hogar";
  if (/bugaboo|bebé|barba|gillette|moda/.test(text)) return "Moda";
  return "Tecnología";
}

function couponFor(text?: string) {
  return text?.match(/CUP[ÓO]N:\s*([A-Z0-9-]{3,24})/i)?.[1];
}

const importedDeals: Deal[] = (rawOffers as LegacyOffer[]).flatMap((offer) => {
  const price = parsePrice(offer.price);
  const extractedPrevious = offer.text?.match(/(?:PRECIO ANTERIOR|ANTES):\s*([\d.,]+)\s*(?:€|EUR)/i)?.[1];
  const previous = parsePrice(offer.previousPrice || extractedPrevious);
  const title = cleanTitle(offer.title);
  if (!price || !title || !offer.url || !offer.image) return [];
  const store: Deal["store"] = offer.store === "Amazon" || offer.store === "AliExpress" ? offer.store : "Otra";
  return [{
    id: String(offer.chollometroId || offer.message_id || offer.url),
    title,
    store,
    category: categoryFor(offer),
    price,
    oldPrice: previous > price ? previous : price,
    coupon: couponFor(offer.text),
    imageUrl: offer.image,
    affiliateUrl: offer.url,
    badge: previous > price ? "Precio rebajado" : undefined,
    verifiedAt: offer.date ? new Date(offer.date * 1000).toLocaleDateString("es-ES") : "recientemente",
  }];
});

const categories = ["Todos", "Tecnología", "Hogar", "Cocina", "Moda"];
const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function DealExplorer() {
  const [deals, setDeals] = useState<Deal[]>(importedDeals);
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/deals")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => { if (Array.isArray(payload.deals) && payload.deals.length) setDeals(payload.deals); })
      .catch(() => undefined);
  }, []);

  const visibleDeals = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return deals.filter((deal) => (category === "Todos" || deal.category === category) && (!needle || deal.title.toLocaleLowerCase("es").includes(needle)));
  }, [deals, category, query]);

  const averageDiscount = useMemo(() => {
    const discounted = deals.filter((deal) => deal.oldPrice > deal.price);
    if (!discounted.length) return 0;
    return Math.round(discounted.reduce((total, deal) => total + (1 - deal.price / deal.oldPrice) * 100, 0) / discounted.length);
  }, [deals]);

  function copyCoupon(code: string) {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <main>
      <div className="ticker" aria-label="Aviso"><span>🔥 CHOLLOS NUEVOS CADA DÍA</span><span>Precios comprobados antes de publicar</span><span>Enlaces directos y cupones claros</span></div>
      <header className="header shell">
        <a className="brand" href="#inicio" aria-label="ChollosAlDía, inicio"><span className="brandMark">%</span><span>chollos<span>al</span>día</span></a>
        <nav aria-label="Navegación principal"><a href="#chollos">Chollos</a><a href="#como-funciona">Cómo funciona</a><a className="telegram" href="https://t.me/chollosaldia" target="_blank" rel="noreferrer">Telegram ↗</a></nav>
      </header>

      <section className="hero shell" id="inicio">
        <div className="heroCopy">
          <p className="eyebrow"><span /> Seleccionados por personas, no por ruido</p>
          <h1>Menos precio.<br/><em>Más alegría.</em></h1>
          <p className="lede">Rastreando descuentos para enseñarte solo las ofertas que de verdad merecen la pena. Sin rodeos y con el ahorro bien claro.</p>
          <div className="heroActions"><a className="primaryButton" href="#chollos">Ver chollos de hoy <span>↓</span></a><a className="textLink" href="https://t.me/chollosaldia" target="_blank" rel="noreferrer">Recibir alertas en Telegram ↗</a></div>
          <div className="trust"><span>✓ Selección diaria</span><span>✓ Cupones visibles</span><span>✓ Sin coste para ti</span></div>
        </div>
        <aside className="heroDeal" aria-label="Resumen del ahorro">
          <span className="stamp">HOY</span><div className="spark">✦</div><p>Ahorro medio en<br/>ofertas con rebaja</p><strong>−{averageDiscount}%</strong><small>Calculado con precios publicados</small>
        </aside>
      </section>

      <section className="dealsSection" id="chollos">
        <div className="shell">
          <div className="sectionHeading"><div><p className="eyebrow"><span /> Recién encontrados</p><h2>Chollos de hoy</h2></div><p className="counter"><strong>{visibleDeals.length}</strong> ofertas visibles</p></div>
          <div className="controls">
            <div className="filters" role="group" aria-label="Filtrar por categoría">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
            <label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar un producto" aria-label="Buscar chollos" /></label>
          </div>
          {deals.some((deal) => deal.isDemo) && <div className="demoNotice">Vista de demostración · conecta tus cuentas para publicar ofertas reales automáticamente.</div>}
          <div className="dealGrid">
            {visibleDeals.map((deal) => {
              const discount = Math.round((1 - deal.price / deal.oldPrice) * 100);
              return <article className="dealCard" key={deal.id}>
                <div className="imageWrap"><img src={deal.imageUrl} alt={deal.title} loading="lazy"/>{discount > 0 && <span className="discount">−{discount}%</span>}{deal.badge && <span className="badge">{deal.badge}</span>}</div>
                <div className="dealBody"><div className="meta"><span className={`store ${deal.store.toLowerCase()}`}>{deal.store}</span><span>{deal.category}</span></div><h3>{deal.title}</h3><div className="pricing"><strong>{money.format(deal.price)}</strong>{discount > 0 && <><s>{money.format(deal.oldPrice)}</s><span>Ahorras {money.format(deal.oldPrice - deal.price)}</span></>}</div>
                  {deal.coupon ? <button className="coupon" onClick={() => copyCoupon(deal.coupon!)}><span>Cupón</span><b>{copied === deal.coupon ? "¡Copiado!" : deal.coupon}</b><i>□</i></button> : <div className="noCoupon">Precio directo, sin cupón</div>}
                  <a className="dealButton" href={deal.affiliateUrl} target={deal.isDemo ? undefined : "_blank"} rel="nofollow sponsored noreferrer">Ver oferta <span>→</span></a>
                  <p className="verified">● {deal.isDemo ? "Oferta de ejemplo" : `Verificado ${deal.verifiedAt}`}</p>
                </div>
              </article>;
            })}
          </div>
          {!visibleDeals.length && <div className="empty">No encontramos chollos con esos filtros. Prueba otra búsqueda.</div>}
        </div>
      </section>

      <section className="how shell" id="como-funciona"><div><p className="eyebrow"><span /> Cero complicaciones</p><h2>Nosotros buscamos.<br/>Tú te llevas el chollo.</h2></div><ol><li><b>01</b><div><strong>Rastreamos</strong><p>Detectamos bajadas de precio y cupones en tiendas de confianza.</p></div></li><li><b>02</b><div><strong>Revisamos</strong><p>Comprobamos que el ahorro sea real y explicamos cómo conseguirlo.</p></div></li><li><b>03</b><div><strong>Te avisamos</strong><p>Publicamos en la web y enviamos la alerta al canal de Telegram.</p></div></li></ol></section>

      <section className="telegramCta"><div className="shell"><div><span className="paperPlane">➤</span><p className="eyebrow">Antes que nadie</p><h2>Los mejores chollos<br/>vuelan por Telegram.</h2></div><a href="https://t.me/chollosaldia" target="_blank" rel="noreferrer">Unirme gratis <span>↗</span></a></div></section>

      <section className="faq shell"><p className="eyebrow"><span /> Lo importante</p><h2>Preguntas frecuentes</h2><details><summary>¿Cómo seleccionáis los chollos?<span>+</span></summary><p>Revisamos el descuento, el precio anterior, la utilidad del producto y la disponibilidad antes de publicar.</p></details><details><summary>¿Los precios pueden cambiar?<span>+</span></summary><p>Sí. Los precios y cupones dependen de cada tienda y pueden cambiar o agotarse sin previo aviso.</p></details><details><summary>¿Comprar desde vuestros enlaces cuesta más?<span>+</span></summary><p>No. Podemos recibir una comisión por compra, sin coste adicional para ti. Esto ayuda a mantener el proyecto.</p></details></section>

      <section className="config" id="configuracion"><div className="shell"><span>⚙</span><div><strong>Lista para conectar tus afiliados</strong><p>La web ya admite ofertas reales y publicación automática. Solo faltan tus identificadores y claves privadas.</p></div></div></section>
      <footer><div className="shell footerGrid"><div><a className="brand" href="#inicio"><span className="brandMark">%</span><span>chollos<span>al</span>día</span></a><p>Tu radar diario de ofertas que sí merecen la pena.</p></div><div><strong>Explora</strong><a href="#chollos">Últimos chollos</a><a href="#como-funciona">Cómo funciona</a><a href="https://t.me/chollosaldia">Canal de Telegram</a></div><div><strong>Legal</strong><a href="/aviso-legal">Aviso legal</a><a href="/privacidad">Privacidad</a><a href="/afiliacion">Política de afiliación</a></div></div><div className="shell footnote"><span>© {new Date().getFullYear()} ChollosAlDía</span><p>Como afiliado, ChollosAlDía puede obtener ingresos por las compras adscritas que cumplen los requisitos aplicables. El precio para ti no cambia.</p></div></footer>
    </main>
  );
}
