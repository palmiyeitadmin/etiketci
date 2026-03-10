# Architecture: Product Domain

## 1. Domain Entities
The Product Domain is the core repository of physical goods that require labels. It is modeled with high normalization to support future vendor and category-specific logic.

### Vendor
Physical or logical source of products. 
- `Id`: Guid
- `Code`: Unique string identifier used for imports/lookups.
- `Name`: Human-readable name.

### Product Category
Hierarchical or flat categorization for UI grouping.
- `Id`: Guid
- `Code`: Unique string identifier.
- `Name`: Display name.

### Product
The central entity for labelling.
- `Sku`: Unique Stock Keeping Unit (Unique Index).
- `Name`: Official product title.
- `CategoryId`: Reference to category (can be null for unclassified).
- `VendorId`: Reference to vendor.
- `IsActive`: Soft-toggle for product availability.

## 2. Uniqueness Rules
- **SKU Unique:** Two products cannot share the same SKU across the entire system.
- **Vendor Code Unique:** Used as the lookup key in CSV imports.
- **Category Code Unique:** Lookup key in CSV imports.

## 3. CSV Import Logic (Dry-Run Only)
To preserve data integrity, the system implements a strict "Dry-Run First" pattern for bulk product ingestion.

### Validation Strategy
1. **Malformed Check:** Rows must have non-empty SKU and Name.
2. **File Duplicates:** SKU must not repeat within the uploaded file.
3. **Database Conflict:** SKU must not already exist in the `Products` table.
4. **Reference Integrity:** `CategoryCode` and `VendorCode` must exist in the database before the product row is considered valid.

### Workflow
- User uploads `.csv` file to `/api/Products/import/dry-run`.
- Backend utilizes `IProductImportService` to stream columns and perform set-based lookups in memory against a DB snapshot.
- Report DTO returns `total`, `valid`, and `error` counts along with a row-by-row error detail list.
- **Commit Mode (Sprint 4+):** The actual database persistence will be triggered by a secondary confirmation step after the user reviews the Dry-Run report.

## 4. MVP Boundaries
- **No Stock Inventory:** This domain tracks metadata, not current stock levels.
- **No Price History:** Prices are handled in labels/templates, not as core Product attributes in this sprint.
- **No Variations:** Each SKU is a distinct entry. Parent/Child relationships are currently out of scope.
