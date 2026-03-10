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
