---
description: Turn a requested feature into a precise project-aligned specification with scope, constraints, impact, risks, and acceptance criteria.
---
# /spec-feature

## Purpose
Turn a requested feature into a precise project-aligned specification with scope, constraints, impact, risks, and acceptance criteria.
Deeply analyze a requested feature and translate it into a concrete, bounds-checked spec before writing any code.
The expected outcome is an approved `spec.md` artifact.

## When To Use
Use this workflow when:
- the user requests a new feature or significant enhancement to the PLMS.

Do not use this workflow when:
- fixing minor bugs or making trivial UI adjustments
- resolving technical debt without feature impact

## Inputs
Required inputs:
- Feature request details from the user.
- `agent.md` and current architecture docs.

Optional inputs:
- Error logs or user reports if applicable.

Assumptions:
- The requested feature must fit within the Epson-only, PDF-based print MVP unless explicitly stated otherwise by a primary stakeholder.

## Procedure
1. Inspect the current repository state and relevant documents before making changes.
2. Identify the exact scope of the request and restate it internally in precise terms.
3. Validate constraints: Check if the feature violates the MVP boundaries defined in `agent.md`.
4. Draft the Spec: Create a temporary artifact `spec.md` detailing Goal, Scope, API Impact, DB Impact, UI Impact, Risks, and Acceptance Criteria.
5. Present Spec: Request user review via `notify_user`.
6. Update validation artifact if necessary based on user feedback.

## Outputs
This workflow must produce:
- An artifact named `spec.md`.

The output must include:
- Goal
- Scope (in-scope and explicitly out-of-scope logic)
- API Impact (respecting `api-contracts.md`)
- DB Impact
- UI Impact
- Risks (e.g., unit conversion drift, state machine bypass)
- Acceptance Criteria

## Validation Checks
Before considering this workflow complete, verify:
- The spec does NOT introduce Zebra/ZPL/QZ Tray logic.
- The spec relies solely on the Epson PDF flow and Entra ID for auth.
- The spec details explicit Next.js component impacts and .NET controller boundaries.
- output is consistent with project architecture
- output does not violate MVP boundaries

## Stop Conditions
Stop and report if:
- the request would violate project guardrails (e.g., adding ZPL support)
- the requested scope expands beyond this workflow’s purpose (e.g., requires entirely new printing paradigm)

## Escalation Conditions
Escalate explicitly when:
- the feature requires modifying the `UnitConverter` or altering the fundamental Canonical Label Model
- a new architecture decision is required
- there is a contradiction between docs and implementation

## Project-Specific Guardrails
Always enforce:
- Epson-only PDF print flow
- UnitConverter consistency
- Canonical label model vendor neutrality

Never:
- design APIs that deviate from `api-contracts.md`
- propose bypassing Entra ID RBAC

## Completion Criteria
This workflow is complete only when:
- `spec.md` exists and is detailed
- validation checks pass
- the user approves the spec
- the next action (planning) is obvious to the next agent
