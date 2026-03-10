# Architecture: Template Lifecycle

## Overview
Templates govern the visual layout. Because printed physical goods rely on them, their history must be strictly preserved.

## Finite State Machine
- `Draft`: Working copy. Excluded from production runs.
- `In Review`: Locked. Pending QA or Supervisor approval via RBAC.
- `Approved`: Ready to be moved to active.
- `Published`: **The single active version.** An immutable snapshot.
- `Deprecated`: Replaced by a newer version. Used only to view historical print jobs.
- `Archived`: Soft-deleted.

## Finalized State Model
The implementation follows the finite state machine defined in [Template Domain Architecture](./template-domain.md).

### Immutability Rule
Once a Template version reaches `Published`, it can no longer be edited. 
1. User clicks "New Version".
2. System clones the layout to a new `Draft` with `VersionNumber++`.

### Database Schema (Implemented)
- `Templates` table: Stores metadata and current active pointer.
- `TemplateVersions` table: Stores `LayoutJson` and historical status.

