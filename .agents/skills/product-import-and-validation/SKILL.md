---
name: product-import-and-validation
description: Teach the agent how CSV import, dry-run validation, error reporting, and rollback-safe import behavior should work.
---
# Skill: Product Import & Validation

## Purpose
Manage bulk ingestion of product data via CSV efficiently and safely.

## Dry-Run First Principle
- All bulk imports must support a `dry-run` phase.
- The backend parses the CSV, validates types, business rules, and duplicate constraints.
- Returns a list of errors per row.
- If errors exist, the import cannot be committed.

## Import Safety
- Transactions must wrap the final commit. If one row fails during actual commit due to a race condition, the entire batch must rollback.
- Logs must record: "User X imported Y rows from file Z".

## Constraints
- Avoid complex nested Excel mappings; stick to flat CSV for MVP.
- Do not bypass this API endpoint or dry-run step for any "fast path" unless documented under high privilege.
