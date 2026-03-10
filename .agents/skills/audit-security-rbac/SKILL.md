---
name: audit-security-rbac
description: Teach the agent audit logging, correlation IDs, RBAC, authentication boundaries, and security-sensitive actions.
---
# Skill: Audit, Security & RBAC

## Purpose
Ensure all critical system functions in PLMS are secure, tracked, and correctly authorized via Microsoft Entra ID.

## Entra ID Authentication
- Frontend authenticates with Entra ID, acquires JWT.
- Backend validates JWT bearer token.

## Role-Based Access Control
- Roles map to Entra ID App Roles or group claims.
- Example roles: `PlmsAdmin`, `TemplateDesigner`, `PrintOperator`.
- API endpoints must enforce role checks (`[Authorize(Roles="...")]` etc.).

## Audit Logging
- Every mutate operation (`POST`, `PUT`, `DELETE`, `PATCH`) must write to an `AuditLogs` table.
- **Payload:** User ID, Action (e.g., `TEMPLATE_PUBLISHED`), Entity ID, Correlation ID, Timestamp.
- Print actions MUST log "User Printed Product X with Template Y".

## Constraints
- Never bypass the token validation.
- Do not store local passwords.
- Audit logs are append-only. They cannot be updated or deleted via the API.
