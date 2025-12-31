#!/bin/sh
set -eu

if [ -f "./node_modules/.bin/prisma" ]; then
  npx prisma generate
  if [ -n "${DATABASE_URL:-}" ]; then
    npx prisma migrate deploy
  fi
fi

npm run start
