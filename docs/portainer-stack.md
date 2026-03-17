# Portainer Stack Guide

This repository is prepared for Portainer repository-based deployment.

## Files used by Portainer
- `docker-compose.yml`
- `stack.env`

## What must be updated before deployment
Edit `stack.env` and replace:
- every `change-me` value
- every `example.com` URL

Minimum required values:
- `APP_PUBLIC_ORIGIN`
- `API_PUBLIC_ORIGIN`
- `NEXTAUTH_SECRET`
- `JWT_KEY`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

## Volumes
Current persistent volume requirements:
- PostgreSQL data volume only

Named volume:
- `DB_VOLUME_NAME`

There is no separate asset file volume right now because uploaded content assets are stored in PostgreSQL.

## Portainer repository settings
Recommended values:
- Repository URL: `https://github.com/palmiyeitadmin/etiketci.git`
- Repository reference: `refs/heads/main`
- Compose path: `docker-compose.yml`

## Current host-safe default ports
Based on the current Portainer host screenshot, these defaults avoid the already used ports:
- Frontend: `3004`
- Backend API: `5001`
- PostgreSQL: `5433`

Public URLs currently prepared in `stack.env`:
- `APP_PUBLIC_ORIGIN=http://192.168.0.99:3004`
- `API_PUBLIC_ORIGIN=http://192.168.0.99:5001`

## Published ports
- Frontend: `FRONTEND_PORT`
- Backend: `BACKEND_PORT`
- PostgreSQL: `DB_PORT`

If you deploy behind a reverse proxy, keep the internal service ports unchanged and expose only the ports you actually need.

## Important runtime/build detail
The frontend uses:
- `NEXT_PUBLIC_API_URL` at build time
- `NEXTAUTH_URL` at build and runtime

Because of that, the repository deployment must build the frontend with the final public URLs already present in `stack.env`.
