# Palmiye Label Management System (PLMS)

This repository contains the foundation of the PLMS application.

## Quick Start
1. Ensure Docker Desktop is running.
2. Spin up the local database: `docker-compose up -d db`
3. Setup the backend: 
```bash
cd src/backend
# copy appsettings and configure
dotnet run
```
4. Setup the frontend:
```bash
cd src/frontend
npm i
npm run dev
```

For domain context, architectural limits, and guardrails, refer to the files in `docs/` and `.agents/`.

## Portainer Stack Deployment
1. Commit `docker-compose.yml` and `stack.env` to the repository.
2. In `stack.env`, replace every `change-me` and `example.com` value with the real deployment values.
3. In Portainer, create a stack from the Git repository.
4. Use:
   - Repository reference: `refs/heads/main`
   - Compose path: `docker-compose.yml`
5. Portainer repository deployments require the `stack.env` file to exist in the repo root. This repository already includes it.
6. Persistent storage is required only for PostgreSQL in the current stack. The named volume is controlled by `DB_VOLUME_NAME`.

### Required variables
- `APP_PUBLIC_ORIGIN`: public URL of the frontend, for example `https://plms.example.com`
- `API_PUBLIC_ORIGIN`: public URL of the backend API, for example `https://api.plms.example.com`
- `NEXTAUTH_SECRET`: long random secret for NextAuth session signing
- `JWT_KEY`: long random secret for backend JWT signing
- `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`: initial administrator credentials

### Notes
- The frontend needs the public API URL at build time. Portainer must build from the repository using the values in `stack.env`.
- Shared uploaded assets are stored in PostgreSQL, so there is no separate asset volume at this time.
- `pull_policy: build` is set for frontend and backend so Portainer rebuilds the images from the repository source.
- Based on the current Portainer host port usage, the committed defaults use `http://192.168.0.99:3000` for the frontend and `http://192.168.0.99:5001` for the API.
