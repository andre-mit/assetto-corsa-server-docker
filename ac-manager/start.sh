#!/bin/sh
set -e

echo "[startup] Running Prisma migrations..."
bun x prisma migrate deploy

echo "[startup] Running database seed..."
bun x tsx prisma/seed.ts || echo "[startup] Seed skipped (user may already exist)"

echo "[startup] Starting server..."
exec bun server.js
