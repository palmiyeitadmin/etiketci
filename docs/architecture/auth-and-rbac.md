# Architecture: Authentication and RBAC

## Entra Auth Flow Summary
The PLMS platform uses Microsoft Entra ID (Azure AD) for its unified authentication and authorization fabric. 
- **Frontend Flow:** Next.js uses NextAuth (`next-auth/providers/azure-ad`) to prompt the user, issue an Access Token, and map the Entra ID claims (including `roles`) into the local session context.
- **Backend Flow:** .NET 8 Web API expects the JWT token in the `Authorization: Bearer` header. It validates the token against the Entra ID tenant JWKS endpoints and maps the `roles` claim back into the `ClaimsPrincipal`.

## Roles & Policies
We currently define the following core roles:
- **Admin**: Full access.
- **Reviewer**: Can review/approve templates.
- **Operator**: Authorized to select templates and execute print jobs.
- **Viewer**: Read-only access to catalogs and history.

These are explicitly enforced in the Backend via `[Authorize(Policy = "Require...")]` attributes, mapping backwards to include super-roles (e.g. `RequireOperator` permits `Operator` or `Admin`).

## Local Development Limitations
Local environments currently use developer-specific Entra ID Tenant coordinates inside `.env.local` and `appsettings.Development.json`. 
- **Mocking:** Production code paths do NOT have "fake auth" shortcuts. If working locally without Entra ID access, developers must seed valid mock JWT tokens matching the app's secret or explicitly connect a personal MS Developer tenant.

## Audit Interactions
The `AuditLog` entity is bound to actions taken by the `{UserId}` and carries a `CorrelationId`. Sensitive requests require authorization parsing to inject these metadata properties into EF Core contexts before saving.
