## Objectif
Authentification MVP en mode solo avec email + mot de passe, sessions via cookies httpOnly.

## Fonctionnement actuel
- Login: `POST /api/auth/login`
  - Verifie l'utilisateur (bcrypt) et cree une session en base.
  - Pose le cookie `jamae_session` (httpOnly, sameSite=lax, secure en prod).
- Session: `GET /api/auth/session`
  - Retourne l'utilisateur courant si session valide.
- Logout: `POST /api/auth/logout`
  - Supprime le cookie de session et invalide en base.
- Bootstrap admin:
  - Si aucun user n'existe, un premier login avec `ADMIN_EMAIL` / `ADMIN_PASSWORD`
    cree le compte admin automatiquement.

## Donnees en base
- `User`: email, passwordHash, role, active.
- `Session`: token, expiresAt, userId.

## Variables d'environnement
- `AUTH_SESSION_DAYS`: duree de session en jours (defaut 7).
- `ADMIN_EMAIL`: email du compte admin initial.
- `ADMIN_PASSWORD`: mot de passe du compte admin initial.

## Securite
- Mots de passe haches via bcrypt.
- Cookies httpOnly (non accessibles par JS).
- Expiration et invalidation de session gerees en base.

## UI
- Ecran login existant (`/login`) sans modification visuelle.
