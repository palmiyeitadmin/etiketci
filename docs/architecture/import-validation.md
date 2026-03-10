# Architecture: Import & Validation

## The Dry-Run Principle
When pulling in large CSV product catalogs, the system cannot afford a mid-batch failure that corrupts existing relational integrity.

## Execution Flow
1. **Upload:** Client posts `multipart/form-data` with `[?dryRun=true/false]`.
2. **Parsing:** Backend reads CSV streams line-by-line avoiding extreme memory exhaustion. Maps strictly to DTOs.
3. **Core Validation:** Uses `FluentValidation` over the DTO batch. Checks for missing names, duplicate SKUs (in file and DB), and invalid template assignments.
4. **Dry-Run Response:** If `dryRun`, returns a JSON object of `ImportResult` detailing `TotalRows`, `ValidRows`, `ErrorMap { row: [], error: string }`.
5. **Commit (No Dry-Run):** If not dry run:
   - Begin DB Transaction.
   - Insert rows via EF Core.
   - Write bulk AuditLog entry ("User X imported Y rows").
   - Commit Transaction.

## Constraints
- **All or Nothing:** If any single row fails to validate during the real commit, the transaction rolls back returning the conflict data.
- **MVP Simplicity:** Stick to basic CSV for now. Do not entertain complex multi-tab Excel document reading yet.
