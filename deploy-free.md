# Despliegue gratis

## Opción recomendada: GitHub Pages
1. Crear un repo en GitHub
2. Subir esta carpeta `offers-web`
3. Ir a Settings > Pages
4. Activar Pages desde la rama `gh-pages` o usar Actions
5. Añadir Secrets:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHANNEL_ID`
   - `SITE_URL` (ej: `https://chollosaldia.com`)

## Cómo apuntar el dominio
En tu DNS crea:
- `A` o `CNAME` según te diga GitHub/Cloudflare
- SSL automático cuando quede propagado

## Para que se actualice sola
- GitHub Actions ejecuta `sync-from-telegram.js`
- Luego ejecuta `build.js`
- Publica en `gh-pages`

## Resultado
- barato: 0€/mes
- SEO decente
- actualizaciones automáticas desde Telegram
