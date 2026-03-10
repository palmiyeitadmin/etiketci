---
description: Evaluate whether the current repository state is ready for a milestone or release from architecture, testing, ops, and scope perspectives.
---
# /release-readiness

## Purpose
Evaluate whether the current repository state is ready for a milestone or release from architecture, testing, ops, and scope perspectives.
Provide a final gate-check before deploying the PLMS application to a production or pre-production environment.
The expected outcome is a `release-report.md` detailing readiness status and test pass rates.

## When To Use
Use this workflow when:
- at the absolute end of a development phase
- immediately prior to cutting a release tag
- preparing handoff to production operations

Do not use this workflow when:
- executing feature implementations
- planning a sprint

## Inputs
Required inputs:
- current repository source (`main` branch or release candidates)
- active execution of `docker-compose up`

Optional inputs:
- test coverage reports

Assumptions:
- the `docs/implementation-backlog.md` "now" phase is complete and verified

## Procedure
1. Inspect the repository state for guardrail compliance. Look for QZ Tray, Zebra, or ZPL logic.
2. Docs Completeness: Ensure all files in `docs/` reflect the exact current truth of the system.
3. Feature Completeness: Review `task.md` or `docs/implementation-backlog.md` to ensure all "now" tasks are marked `[x]`.
4. Test Readiness: Run the full test suite (`dotnet test` and `npm run test`).
5. Operational Readiness: Verify that `docker-compose up` cleanly boots the Postgres database, .NET Backend API, and Next.js Frontend without crashing loops.
6. Risk Register: Update `docs/operations/risk-register.md` with any unresolved edge cases, deferred features, or active technical debt.
7. Generate `release-report.md` detailing test pass rates and readiness status, shared with the user.

## Outputs
This workflow must produce:
- A `release-report.md` artifact detailing test pass rates and readiness status, shared with the user.

The output must include:
- confirmation of guardrail compliance
- test execution summary
- container startup success/failure report
- unresolved items from risk register

## Validation Checks
Before considering this workflow complete, verify:
- Zero test failures are permitted.
- The Swagger UI (`/swagger`) successfully loads.
- The Next.js frontend correctly loads its local `.env` values and displays the login screen.
- Entra ID variables are verified to be injected and valid.
- Guardrails are unviolated (no QZ Tray, Zebra, etc.).

## Stop Conditions
Stop and report if:
- execution tests fail
- MVP assumptions are violated in the codebase
- containers crash on startup due to missing default configuration

## Escalation Conditions
Escalate explicitly when:
- operational readiness fails (e.g., containers crash) indicating an environment mismatch.
- unresolved technical debt blocks a critical MVP constraint.

## Project-Specific Guardrails
Always enforce:
- Epson-only MVP constraints during final audit
- `api-contracts.md` compliance across all routes

Never:
- approve a release containing failing tests
- approve a release with missing `.env` instructions

## Completion Criteria
This workflow is complete only when:
- `release-report.md` is produced
- validation checks pass (all green)
- the application is verified to boot cleanly
- the report is shared and next deployment steps are clear
