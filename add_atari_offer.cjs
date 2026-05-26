const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'data', 'offers.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const id = '1600';

async function resolveOfferUrl(rawUrl = '') {
  const input = String(rawUrl || '').trim();
  if (!input || !/^https?:\/\//i.test(input)) return input;
  try {
    const host = new URL(input).hostname.replace(/^www\./i, '').toLowerCase();
    if (!['amzn.to', 's.click.aliexpress.com', 'a.aliexpress.com'].includes(host)) return input;
    const response = await fetch(input, { method: 'GET', redirect: 'follow' });
    return response.url || input;
  } catch {
    return input;
  }
}

(async () => {
  const url = await resolveOfferUrl('https://amzn.to/4dvknkN');
  if (!data.some((x) => String(x.message_id) === id)) {
    data.unshift({
      message_id: 1600,
      date: 1779669480,
      text: `🛍️ OFERTÓN AMAZON 🛍️ ATARI 2600+ PAC-MAN EDITION POR 105,70€\n\nVuela: consola retro en Amazon por tiempo limitado.\n\nAtari 2600+ Pac-Man Edition.\n\n🔥 ENVÍO RÁPIDO DESDE AMAZON 🔥\n\n💶 PRECIO OFERTA: 105,70€\n\n• DESTACADO: Atari 2600+ Pac-Man Edition.\n• ÚTIL: Consola retro para jugar clásicos.\n• OFERTA: Edición Pac-Man para coleccionistas y nostálgicos.\n\n⚠️ PÚLSALO YA ANTES DE QUE SUBA DE PRECIO!\n\n👉 [COMPRAR EN AMAZON](${url})\n\n#Chollos #Amazon #Ofertas`,
      image: 'https://m.media-amazon.com/images/I/81DofQcIogL._AC_SX679_.jpg',
      url,
      title: 'Atari 2600+ Pac-Man Edition por 105,70€',
      price: '105,70€',
      store: 'Amazon',
      description: 'Consola Atari 2600+ Pac-Man Edition para videojuegos retro y coleccionistas.'
    });
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log('updated', data[0].title);
})();
