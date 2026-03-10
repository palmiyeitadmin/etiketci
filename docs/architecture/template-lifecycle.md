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

## Immutability Rule
Once a Template crosses into `Published`, its underlying Canonical Layout JSON is frozen. 
If an edit is required, the user "Creates New Version", which copies the JSON into a new `Draft` associated with the exact same parent `TemplateId`, but a new incremented `VersionNumber`.

## Database Schema Model (Conceptual)
```
Table: Templates
- Id (UUID)
- Name
- CurrentActiveVersionId

Table: TemplateVersions
- Id (UUID)
- TemplateId (UUID, FK)
- VersionNumber (Int)
- Status (String/Enum)
- LayoutJson (JSONB)
```
