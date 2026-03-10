---
description: Implement an approved feature in small safe increments while updating code, docs, and validation artifacts.
---
# /implement-feature

## Purpose
Implement an approved feature in small safe increments while updating code, docs, and validation artifacts.
Execute the approved `plan.md` iteratively while maintaining high code quality and test coverage.
The expected outcome is code changes in `src/backend` and/or `src/frontend`, updated tests, and a summary report.

## When To Use
Use this workflow when:
- executing an approved `plan.md` to build out a feature in the PLMS codebase.

Do not use this workflow when:
- planning a feature without approval.
- fixing trivial bugs that do not require PR-sized iterative plans.

## Inputs
Required inputs:
- `plan.md`
- `task.md` (for tracking progress)

Optional inputs:
- EF Core Migration commands if DB changes are needed.

Assumptions:
- All required infrastructure (DB via docker-compose) is running and in a clean state.

## Procedure
1. Inspect the current repository state and check dependencies.
2. Execute Incrementally: Execute one checklist item from `task.md` at a time.
3. For backend changes, write the EF Core Migration, update DTOs, and implement the Service layer before the Controller.
4. For frontend changes, build the isolated Component before integrating it into the Page route.
5. Validate Locality: As each chunk is built, write or adapt unit tests and run them immediately.
6. Review Constraints: After feature completion, explicitly review `.agents/skills/plms-domain-guardrails/SKILL.md` to ensure no subtle MVP rules were broken.
7. Update Documentation: If the architecture or state machine evolved, update `docs/`.
8. Summarize changed files and validation results sent via `notify_user`.

## Outputs
This workflow must produce:
- Code changes in `src/backend` and/or `src/frontend`
- Updated tests
- A summary report of files changed and validation results

The output must include:
- execution status of `plan.md` tasks
- test pass/fail status
- any architecture updates made

## Validation Checks
Before considering this workflow complete, verify:
- Code compiles without warnings (`dotnet build`, `npm run build`).
- All unit tests pass (`dotnet test`, `npm run test`).
- `.NET` APIs strictly use standard Envelope responses defined in `docs/architecture/api-contracts.md`.
- No Epson-only constraints were violated.

## Stop Conditions
Stop and report if:
- required input (`plan.md` or `task.md`) is missing.
- the request would violate project guardrails.
- an EF core migration fails or causes data loss.

## Escalation Conditions
Escalate explicitly when:
- an EF Core migration fails or causes data loss (ask for rollback instructions).
- a domain rule is ambiguous during implementation.

## Project-Specific Guardrails
Always enforce:
- Epson-only MVP constraints
- API envelopes defined in `api-contracts.md`
- Code-first EF migrations strictly

Never:
- add Zebra/ZPL/QZ Tray logic
- defer unit testing to the end

## Completion Criteria
This workflow is complete only when:
- all tasks in `task.md` are marked `[x]`
- validation checks pass
- the user validates the changes
- the next action is obvious to the next agent
