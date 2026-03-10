# Architecture: Template Domain

## 1. Multi-Entity Model
The Template Domain is structured into two core entities to ensure a strictly preserved and immutable history of printed labels.

### LabelTemplate
The root container for a label "type".
- `Id`: Guid
- `Name`: Human-readable name.
- `Code`: Unique string identifier (e.g., "PACK-A4-V1").
- `CurrentActiveVersionId`: Pointer to the logic-published version.
- `IsActive`: Soft-delete toggle.

### LabelTemplateVersion
A specific immutable snapshot of a template's design.
- `TemplateId`: Foreign key to parent.
- `VersionNumber`: Sequential integer.
- `Status`: Current lifecycle state (Draft, Published, etc.).
- `LayoutJson`: Canonical JSON model stored in Postgres `jsonb`.
- `ChangeNotes`: User-provided justification for the version.

## 2. Immutability & Versioning
- **Drafting:** New changes are always made to a `Draft` version.
- **Publishing:** When a version is `Published`, the previous active version is marked as `Deprecated`. The `LayoutJson` of a `Published` version is immutable.
- **Versioning:** Edits to a published template require the creation of a new `LabelTemplateVersion` with an incremented number.

## 3. Canonical Model Persistence
The `LayoutJson` field stores the vendor-neutral PLMS label model. 
- Validation is enforced at the API level during `POST` operations.
- Data remains independent of physical printer languages (Epson/Zebra).

## 4. RBAC Policy
- **Viewers:** Can list and view all versions.
- **Operators:** Can create new templates and edit `Draft` versions.
- **Reviewers:** Authorized to `Publish` (approve) a specific version for production use.
