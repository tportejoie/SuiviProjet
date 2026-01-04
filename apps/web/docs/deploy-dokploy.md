## Objectif
Deploiement sur VPS avec Dokploy, en buildant l'application Next.js depuis `apps/web` et en utilisant PostgreSQL externe.

## Configuration Dokploy
- Type de service: Dockerfile
- Chemin du Dockerfile: `apps/web/Dockerfile`
- Contexte de build: `apps/web`
- Port expose: `3000`
- Volume persistant: monter `/app/storage` pour conserver PDF et logos.

## Variables d'environnement minimales
- `DATABASE_URL`
- `APP_BASE_URL`
- `AUTH_SESSION_DAYS`
- `FILE_STORAGE_PATH` (optionnel, par defaut `./storage`)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Variables optionnelles (OCR/LLM)
- `OCR_LLM_ENABLED`
- `OCR_LLM_PROVIDER`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `AZURE_DOCINT_ENDPOINT`
- `AZURE_DOCINT_KEY`
- `AZURE_DOCINT_MODEL`
- `AZURE_DOCINT_API_VERSION`

## Notes techniques
- Le container lance `prisma generate` puis `prisma migrate deploy` si `DATABASE_URL` est defini.
- Les fichiers applicatifs generes sont ecrits dans `/app/storage`.
