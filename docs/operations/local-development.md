# Operations: Local Development

## Environment Setup
PLMS is container-first for local development.

## Prerequisites
- Docker Desktop
- Node.js (20+)
- .NET 8 SDK
- A compatible IDE (VS Code / Rider / Visual Studio)

## Docker Compose
The `docker-compose.yml` orchestrates backend dependencies:
- PostgreSQL 16
- pgAdmin / Db Tools

**Running the database:**
`docker-compose up -d db`

## Running the Backend API
```bash
cd src/backend/Plms.Api
dotnet run
```
Runs on `http://localhost:8080` with Swagger at `/swagger`.

## Running the Next.js Frontend
```bash
cd src/frontend
npm i
npm run dev
```
Runs on `http://localhost:3000`.

## The `.env.example` Baseline
Both frontend and backend require active `.env` files copied from a maintained `.env.example`.

### Frontend Requirements (`src/frontend/.env.local`)
```properties
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate_super_secret_for_local_JWT_session>
AZURE_AD_CLIENT_ID=<entra_client_id>
AZURE_AD_TENANT_ID=<entra_common_or_tenant_guid>
```
`NEXT_PUBLIC_API_URL` is required and is the single source of truth for API calls in local development.

**Docker Compose vs Local Dev Distinction**:
- The API always binds to `8080` (locally via `launchSettings.json`, and inside Compose via port-forwarding).
- The Frontend always binds to `3000`.
- CORS in `.NET` expects the `FrontendUrl` to be `http://localhost:3000` by default.

### Backend Requirements (`src/backend/Plms.Api/appsettings.Development.json` or env overrides)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=127.0.0.1;Port=5433;Database=plms;Username=postgres;Password=localpass"
  },
  "SeedAdmin": {
    "Email": "admin@plms.local",
    "Password": "Admin123!",
    "ForceResetPassword": true
  },
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "Domain": "company.onmicrosoft.com",
    "TenantId": "<entra_common_or_tenant_guid>",
    "ClientId": "<entra_backend_api_client_id>"
  }
}
```
**Local Secrets Guidance:** Never track connection strings or Tenant IDs in `.git`. `appsettings.Development.json` or `.env` handles local state entirely.

**Seed Admin Env Overrides (optional):**
- `SeedAdmin__Email`
- `SeedAdmin__Password`
- `SeedAdmin__ForceResetPassword`

By default, `SeedAdmin:ForceResetPassword` is `true` in `Development` and `false` in other environments.

**Strict Auth Requirement:** PLMS strictly requires a real Microsoft Entra ID Tenant for local development. "Fake auth" or mock JWT generation is not supported. You must provision an App Registration in your MS Developer Tenant and populate the `.env.local` and `appsettings.Development.json` values to test the application.

## Seed Data
Startup seeding enforces core roles and local admin behavior:
- Creates `Admin`, `Operator`, `Reviewer`, `Viewer` roles when missing.
- Creates `admin@plms.local` if missing.
- Enforces `EmailConfirmed=true` and `IsActive=true` for seed admin.
- Resets seed admin password on startup in `Development` by default (`Admin123!` unless overridden).
