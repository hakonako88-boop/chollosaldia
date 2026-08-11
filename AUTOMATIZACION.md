# Automatización de ChollosAlDía

La web recibe ofertas mediante `POST /api/deals` y las guarda en la base de datos. Cada alta o actualización puede publicarse automáticamente en Telegram.

## Variables necesarias

Copia `.env.example` como `.env.local` para desarrollo. En producción configura los mismos nombres como secretos. Nunca compartas ni subas las claves al repositorio.

- `AMAZON_ASSOCIATE_TAG`: tracking ID de Amazon Afiliados. Si se envía una URL normal de Amazon, la web añade el parámetro `tag`.
- `IMPORT_SECRET`: contraseña aleatoria para autorizar importaciones.
- `TELEGRAM_BOT_TOKEN`: token de BotFather.
- `TELEGRAM_CHANNEL_ID`: `@nombrecanal` o ID del canal; el bot debe ser administrador.

AliExpress exige que `affiliateUrl` llegue ya generado por AliExpress Portals/Open Platform o por tu herramienta de afiliación. No se inventan parámetros porque eso puede impedir que la venta se atribuya.

## Formato de una oferta

```json
{
  "id": "sku-o-asin-estable",
  "title": "Nombre claro del producto",
  "store": "Amazon",
  "category": "Tecnología",
  "price": 29.99,
  "oldPrice": 59.99,
  "coupon": "SONIDO10",
  "imageUrl": "https://.../foto.jpg",
  "url": "https://www.amazon.es/dp/...",
  "badge": "Top del día"
}
```

Envía la petición con `Authorization: Bearer TU_IMPORT_SECRET`. Para AliExpress usa `affiliateUrl` en lugar de `url`.

## Flujo recomendado

1. Amazon Product Advertising API y AliExpress Portals proporcionan productos, precios, imágenes y enlaces permitidos.
2. Un programador horario (Cloudflare Cron, n8n, Make o servidor propio) filtra los descuentos y llama al endpoint.
3. La web guarda o actualiza la oferta y publica la foto, precio, cupón y enlace en Telegram.
4. Las ofertas caducadas se desactivan enviando el mismo `id` con `active: false`.

No extraigas precios mediante scraping: además de ser frágil, puede incumplir las condiciones de los programas de afiliación. Usa sus APIs o feeds oficiales.
