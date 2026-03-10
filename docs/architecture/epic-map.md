# Epic Map

## Phase 1: Foundation (Now)
- Repository setup & `.agents` configuration
- Entra ID Auth wiring
- Skeleton .NET 8 API with EF Core / Postgres
- Docker Compose local environment

## Phase 2: Core Data (Next)
- Product schema & CRUD
- CSV Import endpoint with dry-run capabilities
- Basic Template storage & versioning

## Phase 3: Label Editor MVP (Next)
- Canonical JSON structure
- Next.js label designer (text, rect, qr, barcode, image)
- UnitConverter (mm strictly maintained)

## Phase 4: Production & Print (Next)
- Backend PDF string-interpolation and rendering (`QuestPDF` is the locked, mandated .NET library).
- UI Print Job tracking & confirmation dialog
- Audit logging & RBAC enforcement

## Future Phases (OUT OF SCOPE FOR MVP)
- Zebra / ZPL abstract printer syntax.
- Silent direct-to-port network printing.
- Complex template loops/tables.
