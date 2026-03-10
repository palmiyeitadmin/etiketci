---
description: Review print-related changes for Epson-only compliance, PDF-based flow correctness, state handling, and audit completeness.
---
# /validate-print-flow

## Purpose
Review print-related code, documents, and behavior for the PLMS Epson-only MVP.
Ensure the print flow remains PDF-based, user-confirmed, and consistent with the project’s operational constraints.
Detect scope creep, incorrect print-state assumptions, missing audit behavior, and browser/driver-related risks.

## When To Use
Use this workflow when:
- print-related code has changed
- print job states or print job DTOs have changed
- PDF generation or print-trigger UI has changed
- audit logging for print or reprint was modified
- Epson print behavior documentation needs review

Do not use this workflow when:
- the change is unrelated to printing
- the task is to design future Zebra/ZPL support
- the task is a generic UI review unrelated to print flow

## Inputs
Required inputs:
- changed print-related files
- current print-flow architecture docs
- current project guardrails in agent.md

Optional inputs:
- screenshots or sample PDFs
- print job database schema changes
- related issue or feature spec

Assumptions:
- the MVP is Epson-only
- physical printing uses PDF opened in the browser
- the user confirms success/failure manually after the print dialog flow

## Procedure
1. Inspect all changed files related to print flow, PDF rendering, print job states, frontend print UI, and audit logging.
2. Read the current print-flow documentation and agent guardrails before evaluating the implementation.
3. Confirm that the implementation still uses backend-generated PDF as the print artifact.
4. Confirm that no QZ Tray, no Zebra, no ZPL, and no silent-print logic was introduced into MVP code or docs.
5. Review the frontend print interaction and verify that browser print dialog limitations are respected.
6. Verify that cancelled, failed, and user-confirmed outcomes are handled explicitly and not guessed.
7. Review print job state transitions for invalid jumps, missing terminal states, or misleading semantics.
8. Verify that print and reprint actions are audit logged with sufficient context.
9. Check that operator guidance such as “Actual Size” / “No Scaling” is reflected where needed.
10. Summarize findings, required fixes, and whether the print flow is compliant.

## Outputs
This workflow must produce:
- a print-flow validation summary
- a list of compliant areas
- a list of violations or risks
- recommended fixes by file if needed

The output must include:
- whether the implementation is still Epson-only
- whether the flow remains PDF-based
- whether print state semantics are correct
- whether audit coverage is sufficient
- whether user-confirmation logic is clear
- any browser/driver limitations that remain

## Validation Checks
Before considering this workflow complete, verify:
- backend PDF generation remains the printing source of truth
- no QZ Tray code or assumptions exist in MVP implementation
- no Zebra or ZPL dependencies appear in MVP implementation
- no silent printing assumptions appear in MVP code or docs
- print states include failure/cancel handling where appropriate
- the system does not claim guaranteed physical print success from browser dialog behavior
- user-confirmed print semantics are preserved
- print and reprint actions are audit logged
- documentation is updated if the print behavior changed

## Stop Conditions
Stop and report if:
- print behavior cannot be determined from code and docs
- the implementation mixes MVP Epson flow with future Zebra flow
- print state transitions are undefined or contradictory
- audit logging for print actions is missing
- the implementation implies silent or automatic background printing in MVP

## Escalation Conditions
Escalate explicitly when:
- a new print orchestration model is being introduced
- a state transition requires domain approval
- browser limitations conflict with product expectations
- the implementation depends on driver-specific behavior not yet documented
- there is disagreement about whether a state is user-confirmed or system-confirmed

## Project-Specific Guardrails
Always enforce:
- Epson-only MVP
- PDF-based print flow
- user-confirmed print result semantics
- audit logging for print and reprint
- strict separation between MVP flow and future printer support

Never:
- reintroduce QZ Tray into MVP
- assume browser print dialog equals confirmed physical print
- add Zebra/ZPL logic into current MVP code paths
- bypass audit logs for print-related actions

## Completion Criteria
This workflow is complete only when:
- the print implementation has been checked against architecture and guardrails
- all critical risks are listed
- all violations are tied to specific files or behaviors
- unresolved decisions are clearly called out
- the next agent can act immediately on the validation result
