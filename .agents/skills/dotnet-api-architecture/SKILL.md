---
name: dotnet-api-architecture
description: Teach the agent how to build the .NET 8 API using clean boundaries, EF Core, validation, DTOs, services, and migrations.
---
# Skill: .NET 8 API Architecture

## Purpose
Maintain clean, maintainable, and highly standardized backend code.

## Layers
1. **API / Presentation:** Minimal APIs or Controllers. Must only parse requests, hand off to Services, and format responses. NO business logic.
2. **Application / Services:** Core business logic, validation, orchestration of saves.
3. **Data / Infrastructure:** EF Core DbContexts, Repositories, Migrations.

## Constraints
- **DTOs Only:** Never leak Entity models to the API responses. Always map `Entity -> DTO` and `DeployRequest -> Entity`.
- **Validation:** Use FluentValidation at the API boundary, plus secondary core invariants in the Domain/Service layer.
- **Migrations:** Code-first EF Core only. Do not manually edit SQL outside of migration `.cs` files.
- **Logging:** Use ILogger structured logging scoped appropriately.
