# Architecture Overview

## Tech Stack
- **Frontend:** Next.js App Router (React 18, TypeScript, Tailwind)
- **Backend:** .NET 8 Web API (C#, Entity Framework Core)
- **Database:** PostgreSQL
- **Security:** Microsoft Entra ID (OIDC / OAuth2)

## Component Interaction
1. **Frontend Editor** issues REST/JSON to standard API boundaries.
2. **.NET Backend** intercepts requests, validates Entra ID JWTs, performs logic, uses EF Core Repo pattern to commit.
3. **PDF Generator** living in the .NET layer maps Canonical Model combined with Product Data into raw PDF bytes.
4. **PostgreSQL** holds `Products`, `Templates`, `AuditLogs`, `PrintJobs`.

## Strict Boundaries
- DTOs ONLY at the network edge.
- Next.js never talks to DB directly.
- All PDF rendering is backend-side to prevent browser inconsistencies.
