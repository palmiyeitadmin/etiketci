# Implementation Backlog

This backlog is prioritized into: **Now**, **Next**, and **Later**. 

## Now (Foundation & Entra Auth)
| Goal | Why | Dependencies | Deliverables | Acceptance Criteria | Risks |
|---|---|---|---|---|---|
| Repository Setup | Standardize layout | None | `src/frontend`, `src/backend` | Next.js and .NET compile. | Minor layout churn. |
| Docker Compose | Standardize local environment | None | `docker-compose.yml` | Postgres spins up. | Port conflicts. |
| Auth (Entra ID) | Security baseline | Repo Setup | JwtBearer logic .NET, NextAuth or MSAL Next.js | Unknown users rejected. Admin logs in. | Token lifetime mapping. |
| DB Schema & Migrations | Core persistence | Docker Compose | EF Core ApplicationDbContext | All tables map to ERD. | Missing foreign keys. |
| Test Strategy Scaffold | Prevent regressions | None | Test projects built. | `dotnet test` runs cleanly. | Flaky tests. |

## Next (Data & Templating)
| Goal | Why | Dependencies | Deliverables | Acceptance Criteria | Risks |
|---|---|---|---|---|---|
| Product CRUD | Core domain entity | DB Schema | Product / API endpoints | Can create/list/edit products. | API performance without pagination. |
| CSV Import Dry-Run | Bulk data onboarding safely | Product CRUD | POST `/import` | Validates data, rejects duplicates, rolls back seamlessly. | Memory limits on huge files. |
| Core Templating CRUD | Save layouts | DB Schema | Template endpoints | Drafts save. Versioning is stubbed. | None. |
| Template Lifecycle | Govern template states | Template CRUD | State transition endpoints. | Draft -> Review -> Approved -> Published. | RBAC bypasses. |
| Role-Based Permissions | Limit destructive actions | Auth, Lifecycle | Policy requirements added. | Only Admins publish templates. | Scope explosion on UI menu hiding. |

## Later (Editor & Print Execution)
| Goal | Why | Dependencies | Deliverables | Acceptance Criteria | Risks |
|---|---|---|---|---|---|
| Canonical Model Base | Math standardization | None | `UnitConverter.ts`, Models. | Logic handles mm to px. | Rounding errors. |
| Label Editor MVP | Visually design labels | Canonical Model | Next.js Canvas UI | Text, rect, barcode, qr, line, image all render on grid. | Figma-creep (building too much). |
| PDF Rendering | Generate physical output | Editor MVP | Backend QuestPDF integrated. | PDF matches UI preview exactly. | Font rendering gaps. |
| Print Jobs & Dialog | User confirmation loop | PDF Rendering | UI Print workflow | Job transitions from `queued` to `user_printed` or `failed`. | Browser popup blocking. |
| Audit Logging | Security mandate | Auth | `AuditLogs` table / interceptor | All mutative actions logged with correlation ID. | Log bloat over time. |
| Reprint Control | Prevent phantom prints | Print Jobs | Reprint endpoint. | Can reprint exact historical version. | Wrong template version used. |
| Seed Data | Quick developer onboarding | DB Schema | EF `HasData`. | Fresh DB has 1 test template and 5 products. | Polluting production if not isolated. |
