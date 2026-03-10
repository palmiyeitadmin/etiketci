# Operations: Deployment 

## Overview
This document defines the deployment topology for the PLMS application from dev to prod.

## Intended Deployment Topology
The PLMS is designed as a typical 3-tier web application, containerized for predictable promotion across environments.

1. **Frontend**: Next.js (Node server for App Router SSR capabilities).
2. **Backend**: .NET 8 Web API.
3. **Database**: PostgreSQL 16+.

> **Note:** The exact production hosting environment (e.g., AWS ECS, Azure Container Apps, or bare-metal Kubernetes) is a pending business decision. However, the architectural boundaries remain identical regardless of the orchestrator.

## Boundaries & Reverse Proxy
- **Reverse Proxy**: Both the Frontend and Backend must sit behind a reverse proxy (e.g., Nginx, Traefik, ALB).
- The proxy dictates routing:
  - `https://plms.company.com/` -> Routes to the Next.js container.
  - `https://plms.company.com/api/*` -> Routes to the .NET container.
- **HTTPS/TLS**: All external traffic MUST be terminated via HTTPS at the Proxy or Load Balancer. Internal container-to-container traffic may run on HTTP if within securely isolated VPC boundaries.

## CORS Expectations
Because the Next.js frontend and .NET backend technically execute as separate origins (unless strictly routed via the same exact proxy prefix), the .NET API must explicitly define a strict CORS policy matching the Next.js environment URLs. Wildcard (`*`) CORS is banned in `production`.

## Environment Segregation
- **Dev/Local**: Leverages `docker-compose` on the developer's machine.
- **Test/Staging**: Deployed into an isolated namespace or sub-account. Linked against a Staging Entra ID App.
- **Production**: Strictly separated DB and Identity boundaries.

## Container Responsibilities
- **Next.js**: Serving HTML/JS, managing user sessions against Entra ID (OIDC), rendering the Editor Canvas UI. It does NOT talk to PostgreSQL natively.
- **.NET API**: The sole authority over Domain logic, Database writes, JWT Bearer verification, and creating the generated PDF byte arrays.

## Secrets Handling
All configuration secrets (Database passwords, Entra Client Secrets) MUST NOT be compiled into container images.
- They must be injected at runtime via Environment Variables mapped from a secure vault (e.g., Azure KeyVault or Kubernetes Secrets).

## Logging, Monitoring, & Backup
- **Logging**: Containers must output structured JSON to `stdout`. 
- **DB Backups**: The PostgreSQL database must have automated Point-in-Time-Recovery (PITR) configured by the hosting provider prior to Prod launch.
