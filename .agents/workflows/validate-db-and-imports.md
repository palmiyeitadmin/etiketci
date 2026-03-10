---
description: Review schema, migrations, imports, validations, and dry-run behavior for safety, consistency, and rollback integrity.
---
# /validate-db-and-imports

## Purpose
Review schema, migrations, imports, validations, and dry-run behavior for safety, consistency, and rollback integrity.
Ensure database schema migrations and bulk CSV ingestion endpoints are atomic, strictly validated, and safe from partial-success corruption.
The expected outcome is a validation report confirming DB transactional safety and correct schema definitions.

## When To Use
Use this workflow when:
- reviewing PRs that introduce new EF Core Migrations
- modifying the Product catalog CSV import logic
- updating Entity schemas or DB context

Do not use this workflow when:
- editing purely frontend code
- changing infrastructure routing config

## Inputs
Required inputs:
- code changes impacting `DbContext`, Entity classes, Migrations, or `POST /api/products/import`

Optional inputs:
- sample valid and malformed CSV test files

Assumptions:
- PostreSQL is accessible for local migration testing
- EF Core code-first approach is the standard

## Procedure
1. Inspect the EF Migrations: Ensure only Code-First Entity Framework migrations are used.
2. Run the migration forward on a local PostgreSQL instance and apply a rollback to ensure safety.
3. Verify Schema Adherence: Ensure domain entities do not leak into the API (DTOs are strictly used) and no Entity lacks a primary key.
4. Test CSV Dry-Run Execution: Execute the CSV import endpoint with `dryRun=true` targeting a malformed CSV (missing fields, duplicate keys, invalid templates).
5. Test Commit Safety: Execute the CSV import endpoint with `dryRun=false` targeting a good CSV but manually fail one row mid-stream to prove transaction rollback.
6. Review Audit Trail: Query `AuditLogs` to ensure the bulk import was recorded.
7. Summarize the migration safety and transaction guarantees.

## Outputs
This workflow must produce:
- A validation report summarizing migration safety and transaction guarantees.

The output must include:
- results of migration forward/backward tests
- results of dry-run malformed testing
- results of rollback transaction tests
- audit log verification status

## Validation Checks
Before considering this workflow complete, verify:
- Schema rules: relationships (e.g., Template -> Product) are backed by explicit Foreign Keys.
- Rollback Safety: a partial-failure in `dryRun=false` results in a total transaction rollback (no orphaned rows).
- CSV dry-run scenarios: traps missing fields, duplicated keys inside the file, duplicate keys already in the database, and invalid template references.
- Audit logging for successful imports.

## Stop Conditions
Stop and report if:
- Migrations fail to apply cleanly to the database.
- Database changes are manual SQL scripts instead of EF Migrations.

## Escalation Conditions
Escalate explicitly when:
- an import relies on "Save-as-you-go" batches without a wrapping transaction for the block (risking corruption).
- a rollback cannot be implemented safely.

## Project-Specific Guardrails
Always enforce:
- Code-first EF Migrations exclusively
- DTO isolation from database Entities
- Dry-run capabilities for any bulk import endpoint
- CSV dry-run rollback safety

Never:
- leak EF tracking Entities into API responses
- execute partial imports without transaction safety

## Completion Criteria
This workflow is complete only when:
- the schema is sound.
- migrations apply and rollback cleanly.
- imports are proven atomic and dry-run capable.
- all critical scenarios are tested and summarized.
