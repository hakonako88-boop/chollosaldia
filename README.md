# Chollos al Día

Sitio gratis para ofertas/chollos con sync desde Telegram.

## Lo que hace
- Importa ofertas desde el canal de Telegram
- Guarda las fotos reales del post
- Genera una web rápida con SEO básico
- Publica gratis con GitHub Pages

## Configuración
Copia `.env.example` a `.env` y rellena:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHANNEL_ID`
- `SITE_URL`

## Uso local
```bash
npm install
npm run sync
npm run build
```

## Despliegue
Lee `deploy-free.md`.
