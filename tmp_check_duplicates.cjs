const fs = require('fs');
const offers = JSON.parse(fs.readFileSync('data/offers.json', 'utf8'));
const loreal = offers.filter((o) => /L.?OR|HYDRA ENERGETIC/i.test(`${o.text || ''} ${o.title || ''}`));
console.log(JSON.stringify({
  total: offers.length,
  lorealCount: loreal.length,
  lorealIds: loreal.map((o) => o.message_id),
  titles: loreal.map((o) => o.title)
}, null, 2));
