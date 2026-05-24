# Siguientes pasos

1. Crear un repo en GitHub llamado `offers-web` o similar.
2. Subir toda esta carpeta.
3. En GitHub > Settings > Secrets and variables > Actions:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHANNEL_ID`
   - `SITE_URL=https://chollosaldia.com`
4. En GitHub > Settings > Pages:
   - usar la rama `gh-pages` como publicación si lo prefieres.
5. Ir a Actions y lanzar el workflow `sync-and-build` una vez.
6. Esperar a que publique.
7. Apuntar el dominio `chollosaldia.com` al servicio de páginas si hace falta.
