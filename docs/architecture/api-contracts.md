# Architecture: API Contracts

## Goal
Establish a completely stable, predictable REST API dialect between the Next.js frontend and the .NET 8 backend. Consistency prevents serialization bugs and unhandled UI crashes.

## API Envelope Conventions
Every API endpoint in .NET must return an explicit `ApiController` Envelope structure mapping to standard HTTP status codes.

### Success Response (200 OK / 201 Created)
```json
{
  "success": true,
  "data": { ... payload ... },
  "message": "Template saved successfully", // Optional User-facing string
  "correlationId": "xyz-123",
  "meta": { "pagination": { "page": 1, "pageSize": 50, "total": 120 } } // Optional
}
```

### Error Response (400 / 404 / 409 / 500)
```json
{
  "success": false,
  "data": null,
  "error": "VALIDATION_FAILED", // Machine readable constant
  "message": "One or more validation errors occurred.", // Human readable
  "validationErrors": [          // Only present on 400 Bad Request
    { "field": "WidthMm", "message": "Width must be greater than 0" }
  ],
  "correlationId": "xyz-123"     // Critical for tracking to Audit logs
}
```

## DTO Shape Examples

### Print Job Example
When the UI creates a job, the DTO remains lean.
```json
// POST /api/print-jobs
{
  "productId": "uuid-123",
  "templateVersionId": "uuid-456",
  "copies": 1
}

// Result DTO -> Front-end receives URL to download PDF for Browser Print
{
  "id": "job-uuid",
  "pdfDownloadUrl": "/api/print-jobs/job-uuid/render",
  "status": "sent_to_client"
}
```

### Template Layout DTO
The Canonical Label Model is nested under the Data property for fetching Templates.

```json
// GET /api/templates/uuid-123
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "name": "Shipping A",
    "status": "Draft",
    "layoutJson": {
       "version": "1.0",
       "dimensions": { "widthMm": 100, "heightMm": 150 },
       "elements": []
    }
  }
}
```

## Auth Error Patterns
- If Entra ID token is expired or missing: Return `401 Unauthorized`. The UI redirects to Login.
- If Entra ID user lacks RBAC roles for the resource: Return `403 Forbidden`. The UI shows "Access Denied".

## Explicit Rule
The contract shape (`success, data, message, error`) is the supreme boundary. **Do not deviate.** The UI must blindly trust `.success === true` logic loops.
