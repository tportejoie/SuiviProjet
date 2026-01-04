# Jamae Project

Application SaaS de gestion de projets (AT / Forfait), bordereaux, snapshots et OCR.

## Prerequis

- Node.js 18+
- PostgreSQL 14+
- Playwright (pour la generation PDF)

## Installation

Depuis `apps/web` :

1) Installer les dependances
```
npm install
```

2) Configurer l'environnement

Copier `apps/web/.env.example` vers `apps/web/.env` puis completer les variables.

3) Generer le client Prisma et appliquer les migrations
```
npm run db:generate
npm run db:migrate
```

4) Lancer l'application
```
npm run dev
```

## Tests

```
npm run test
```

## Structure

- Application Next.js: `apps/web`
- API et logique serveur: `apps/web/src/server`
- Prisma: `apps/web/prisma`
- Alias TypeScript/Vitest: `@/` -> `apps/web/src`

## Docs

- Analyse: `apps/web/docs/analysis.md`
- Restructure: `apps/web/docs/restructure.md`
- Deploiement: `DOKPLOY.md`

## Notes

- Les PDF sont generes via Playwright. En cas d'erreur, installer les navigateurs :
```
npx playwright install
```
- Les fichiers generes sont stockes dans `apps/web/storage` (chemin configurable via `FILE_STORAGE_PATH`).

## Variables d'environnement

Base (obligatoires) :
- `DATABASE_URL` : URL PostgreSQL.
- `APP_BASE_URL` : URL publique de l'application.
- `AUTH_SESSION_DAYS` : duree des sessions (en jours).

Stockage / PDF :
- `FILE_STORAGE_PATH` : chemin de stockage local (par defaut `./storage`).

OCR / LLM (optionnel) :
- `OCR_LLM_ENABLED` : `true` ou `false`.
- `OCR_LLM_PROVIDER` : `openai` ou `azure`.
- `OPENAI_API_KEY` : cle OpenAI (si `OCR_LLM_ENABLED=true`).
- `OPENAI_MODEL` : modele OpenAI.
- `AZURE_DOCINT_ENDPOINT` : endpoint Azure Document Intelligence.
- `AZURE_DOCINT_KEY` : cle Azure Document Intelligence.
- `AZURE_DOCINT_MODEL` : modele Azure (ex: `prebuilt-document`).
- `AZURE_DOCINT_API_VERSION` : version d'API.

Signature (optionnel) :
- `ADOBE_SIGN_ENABLED` : `true` ou `false`.

Admin (premiere creation) :
- `ADMIN_EMAIL` : email du compte admin initial.
- `ADMIN_PASSWORD` : mot de passe admin initial.

Important : ne commit pas les vraies cles dans le repo. Garde les secrets dans `apps/web/.env` et/ou dans les variables d'environnement de ton hebergeur.

## Dokploy (PostgreSQL externe)

Voir `DOKPLOY.md` pour la configuration complete (Dockerfile, variables et volume de stockage).
