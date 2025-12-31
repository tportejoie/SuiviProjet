# Deploiement Dokploy (PostgreSQL externe)

Ce projet s'appuie sur `apps/web/Dockerfile`. Dokploy peut builder l'image directement depuis le repo.

## Etapes

1) Cree un nouveau service "Dockerfile" dans Dokploy.
2) Renseigne le chemin du Dockerfile : `apps/web/Dockerfile`.
3) Configure les variables d'environnement (voir section ci-dessous).
4) Monte un volume persistant pour `/app/storage` afin de conserver les PDF et logos.
5) Declenche un deploy.

## Variables d'environnement minimales

- `DATABASE_URL` : connexion PostgreSQL externe
- `AUTH_SESSION_DAYS`
- `FILE_STORAGE_PATH` (optionnel, par defaut `./storage`)
- `OCR_LLM_ENABLED`
- `OCR_LLM_PROVIDER`
- `OPENAI_API_KEY` (si OCR/LLM actif)
- `AZURE_DOCINT_ENDPOINT` + `AZURE_DOCINT_KEY` (si OCR Azure actif)

## Notes

- Les migrations Prisma sont lancees au demarrage (`prisma migrate deploy`).
- Les fichiers generes sont ecrits dans `/app/storage`.
