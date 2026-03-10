---
name: plms-domain-guardrails
description: Teach the agent the PLMS domain rules, terminology, lifecycle states, print model, and MVP boundaries.
---
# Skill: PLMS Domain Guardrails

## Purpose
Enforces the strictly-defined domain boundaries for the Palmiye Label Management System (PLMS) MVP.

## When to Use
- Designing new database schemas.
- Adding features to the frontend or backend.
- Deciding on technical approaches.

## Guardrails (MVP Strict Rules)
1. **Target Printer:** Epson ColorWorks CW-C4000e ONLY.
2. **Exclusions:** NO Zebra, NO ZPL, NO QZ Tray, NO silent printing.
3. **Print Flow:** Backend generates a fixed-size PDF -> Frontend receives URL/blob -> User confirms print via browser print dialog.
4. **Lifecycle States:** Draft -> In Review -> Approved -> Published -> Deprecated -> Archived.
5. **Role-Based Access:** All state transitions and object creations require specific roles via Entra ID.

## Expected Actions
Before implementing any feature, answer the following:
- Does this violate the Epson-only constraint?
- Does this introduce unnecessary complexity for a simple MVP editor?
- Are we bypassing the PDF-as-source-of-truth model?

If any answer indicates scope creep, reject the approach and simplify.
