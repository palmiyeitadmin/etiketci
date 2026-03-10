---
description: Consume repo context, read architecture/docs, detect gaps, and prepare the next safe implementation sequence.
---
# /bootstrap-plms

## Purpose
Consume repo context, read architecture/docs, detect gaps, and prepare the next safe implementation sequence.
Orient an agent to the `etiketci` (PLMS) repository, verify guardrails are intact, and prepare for the next development sprint.
The expected outcome is a concise summary report and a proposed safe, MVP-compliant next action.

## When To Use
Use this workflow when:
- embarking on a new development phase or sprint
- an agent joins the repository for the first time
- context needs to be refreshed against the implementation backlog

Do not use this workflow when:
- in the middle of executing a specific task or feature plan

## Inputs
Required inputs:
- current directory context (`c:\Project\etiketci`)
- `agent.md`
- `docs/project-context.md`
- `docs/implementation-backlog.md`
- `.agents/skills/plms-domain-guardrails/SKILL.md`

## Procedure
1. Inspect the current repository state and relevant documents before making changes.
2. Read `agent.md` and `docs/project-context.md` completely.
3. Review `.agents/skills/plms-domain-guardrails/SKILL.md` to internalize the Epson-only constraint.
4. Scan `src/backend` and `src/frontend` to assess the current completion state of the MVP.
5. Compare the repo state against the implementation backlog in `docs/implementation-backlog.md`.
6. Summarize the findings to the user and propose the immediate next actions from the `now` column of the backlog.

## Outputs
This workflow must produce:
- A concise summary report detailing current state and the proposed next action.

The output must include:
- gaps detected between codebase and backlog
- proposed next action
- confirmation that the next action aligns with MVP boundaries

## Validation Checks
Before considering this workflow complete, verify:
- the proposed next action aligns exactly with the explicit MVP boundaries in `agent.md`.
- no future-scope items (e.g., Zebra, QZ Tray) are included in the proposal.
- the output does not violate MVP boundaries.

## Stop Conditions
Stop and report if:
- required input is missing and cannot be safely inferred
- repository state is fundamentally contradictory to `agent.md` (e.g., evidence of QZ Tray implementation)

## Escalation Conditions
Escalate explicitly when:
- there is a contradiction between docs and implementation
- MVP boundaries are violated in the current codebase

## Project-Specific Guardrails
Always enforce:
- Epson-only MVP constraints
- strict separation between MVP flow and future printer support

Never:
- propose features outside the scope of the MVP
- introduce QZ Tray, Zebra, or ZPL logic

## Completion Criteria
This workflow is complete only when:
- the summary report is produced
- the proposed next action is explicitly stated
- validation checks pass
- unresolved items are explicitly listed
