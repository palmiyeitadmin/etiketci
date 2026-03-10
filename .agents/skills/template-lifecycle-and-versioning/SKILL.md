---
name: template-lifecycle-and-versioning
description: Teach the agent template lifecycle rules, versioning strategy, immutability expectations, publication logic, and reprint governance.
---
# Skill: Template Lifecycle & Versioning

## Purpose
Guarantee an auditable, robust process for approving and rendering labels.

## State Machine
- **Draft:** Editable. Not usable for production.
- **In Review:** Locked for editing, pending supervisor approval.
- **Approved:** Approved but not yet active.
- **Published:** Active template. **IMMUTABLE.** Can be used for printing.
- **Deprecated:** Replaced by a newer version. Still exists for historical reprints.
- **Archived:** Hidden from normal view.

## Rules
1. Once a template reaches `Published`, its definition JSON absolutely cannot change. Any edit creates a `Draft` copy with `Version = CurrentVersion + 1`.
2. Reprints must use the exact version of the template that was active at the time of the original print, unless explicitly chosen otherwise by an overrider.
3. Keep the `TemplateId` constant across revisions, but assign a unique `TemplateVersionId` to each immutable snapshot.
